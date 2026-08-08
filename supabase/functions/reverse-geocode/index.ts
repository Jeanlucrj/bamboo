/**
 * reverse-geocode — preenche country_code / region / city nos pings pendentes.
 *
 * Por que não usar ST_Contains contra polígonos de países:
 *   uma tabela world_countries (Natural Earth) pesa dezenas de MB e o teste
 *   espacial por ping fica caro. Denormalizar o país no ping é O(1) na leitura
 *   e é o que o Travel Analytics consome. Se depois quiser precisão offline,
 *   a coluna já existe — basta fazer o join espacial em batch.
 *
 * Efeito colateral importante: ao detectar TROCA DE PAÍS, atualiza
 * profiles.current_country. É isso que faz o Dossiê mostrar o 191 tailandês
 * em vez do 190 brasileiro quando a emergência acontece na Tailândia.
 */
import { admin, assertServiceRole, json, HttpError } from '../_shared/supabaseAdmin.ts';

/**
 * 200 era o lote, e ele nunca coube no tempo disponível.
 *
 * O Nominatim exige no máximo 1 requisição por segundo, então o laço dorme
 * 1,1 s por ping: 200 pings = 220 segundos. O `invoke_edge` do cron corta em
 * 25 s. Na prática a função era morta no meio, e como cada ping é gravado
 * assim que resolve, o resultado ficava pela metade sem nada indicando isso.
 *
 * 15 cabe folgado em 25 s com latência de rede. Rodando de 10 em 10 minutos
 * dá 90 pings/hora — muito acima do que um usuário gera (um ping a cada
 * poucos minutos, e só quando se desloca).
 *
 * Com MAPBOX configurado não há sleep e o lote poderia ser bem maior; o teto
 * continua conservador porque o caminho gratuito é o padrão do projeto.
 */
const BATCH = MAPBOX_ATIVO() ? 100 : 15;

function MAPBOX_ATIVO() {
  return Boolean(Deno.env.get('MAPBOX_SECRET_TOKEN'));
}

const MAPBOX = Deno.env.get('MAPBOX_SECRET_TOKEN');

type Pendente = {
  id: number;
  user_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
};

Deno.serve(async (req) => {
  try {
    assertServiceRole(req);
    const db = admin();

    // RPC, e não `.select('geom')`: o PostgREST devolve `geography` como EWKB
    // em hexadecimal, e o parser de GeoJSON que existia aqui rejeitava 100%
    // dos pings antes de consultar qualquer coisa. A função devolve lat/lng
    // como números, que não dependem de configuração de serialização.
    const { data: pending, error } = await db.rpc('pending_geocode', { p_limit: BATCH });

    if (error) throw new Error(error.message);
    const fila = (pending ?? []) as Pendente[];
    if (!fila.length) return json({ ok: true, processed: 0, countriesUpdated: 0 });

    let processed = 0;
    let semResposta = 0;
    const countryByUser = new Map<string, { code: string; at: string }>();

    for (const row of fila) {
      const place = await lookup(row.lng, row.lat);
      if (!place) {
        semResposta++;
        continue;
      }

      await db
        .from('location_logs')
        .update({
          country_code: place.country_code,
          region: place.region,
          city: place.city,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      processed++;

      // guarda o país do ping mais recente de cada usuário
      const seen = countryByUser.get(row.user_id);
      if (!seen || row.recorded_at > seen.at) {
        countryByUser.set(row.user_id, { code: place.country_code, at: row.recorded_at });
      }
    }

    // Atualiza o país atual de cada usuário afetado.
    for (const [userId, { code }] of countryByUser) {
      const { data: p } = await db
        .from('profiles')
        .select('current_country, push_token')
        .eq('id', userId)
        .single();

      if (p && p.current_country !== code) {
        await db.from('profiles').update({ current_country: code }).eq('id', userId);
        console.log(`[geocode] ${userId}: ${p.current_country ?? '—'} -> ${code}`);
      }
    }

    // `semResposta` no retorno de propósito: com `processed: 0` sozinho não
    // dava para distinguir "não havia nada a fazer" de "havia e tudo falhou".
    // Foi exatamente essa ambiguidade que escondeu o bug do EWKB.
    return json({
      ok: true,
      pendentes: fila.length,
      processed,
      semResposta,
      countriesUpdated: countryByUser.size,
    });
  } catch (e) {
    // Respeitar o status do HttpError: `assertServiceRole` lança 401, e
    // devolver 500 no lugar transformava "sem permissão" em "servidor
    // quebrado" — o tipo de mascaramento que faz perder tempo procurando bug
    // onde não há.
    const status = e instanceof HttpError ? e.status : 500;
    console.error('[geocode]', e);
    return json({ ok: false, error: String(e) }, status);
  }
});

type Place = { country_code: string; region: string | null; city: string | null };

async function lookup(lng: number, lat: number): Promise<Place | null> {
  if (MAPBOX) return lookupMapbox(lng, lat);
  return lookupNominatim(lng, lat);
}

async function lookupMapbox(lng: number, lat: number): Promise<Place | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?types=place,region,country&language=pt&access_token=${MAPBOX}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feats: Array<{ id: string; text: string; properties?: { short_code?: string } }> =
      data.features ?? [];

    const country = feats.find((f) => f.id.startsWith('country'));
    if (!country) return null;

    return {
      country_code: (country.properties?.short_code ?? '').toUpperCase().slice(0, 2),
      region: feats.find((f) => f.id.startsWith('region'))?.text ?? null,
      city: feats.find((f) => f.id.startsWith('place'))?.text ?? null,
    };
  } catch {
    return null;
  }
}

/** Fallback gratuito. Rate limit de 1 req/s — só serve para desenvolvimento. */
async function lookupNominatim(lng: number, lat: number): Promise<Place | null> {
  try {
    await new Promise((r) => setTimeout(r, 1100));
    // `accept-language` não é detalhe de acabamento. Sem ele o Nominatim
    // devolve o topônimo no idioma local, e um ping em Chiang Mai virava
    // "เทศบาลนครเชียงใหม่" no banco. Quem lê isso é o contato de emergência,
    // em pânico, tentando descobrir ONDE a pessoa está — um nome que ele não
    // consegue ler, digitar ou pesquisar não serve para nada.
    //
    // A ordem é a da preferência: português, depois inglês, depois o que
    // houver. Inglês entra como segundo porque quase toda cidade tem exônimo
    // em inglês e quase nenhuma tem em português.
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10` +
        `&accept-language=pt-BR,pt,en`,
      { headers: { 'User-Agent': Deno.env.get('NOMINATIM_USER_AGENT') ?? 'sentinela-dev/0.1' } },
    );
    if (!res.ok) return null;
    const d = await res.json();
    const a = d?.address ?? {};
    const cc = a.country_code;
    if (!cc) return null;

    return {
      country_code: String(cc).toUpperCase().slice(0, 2),
      region: a.state ?? null,
      // `municipality` na lista, e não por capricho: o Nominatim classifica
      // São José dos Campos — e boa parte das cidades brasileiras — como
      // municipality, nunca como city. Sem ele a cidade voltava nula mesmo
      // com a consulta respondendo certo, e o Diário mostrava "0 cidades"
      // para quem tinha rodado o país inteiro.
      city:
        a.city ?? a.town ?? a.municipality ?? a.village ?? a.city_district ?? a.suburb ?? null,
    };
  } catch {
    return null;
  }
}
