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

const BATCH = 200;
const MAPBOX = Deno.env.get('MAPBOX_SECRET_TOKEN');

Deno.serve(async (req) => {
  try {
    assertServiceRole(req);
    const db = admin();

    const { data: pending, error } = await db
      .from('location_logs')
      .select('id, user_id, geom, recorded_at')
      .is('country_code', null)
      .order('recorded_at', { ascending: false })
      .limit(BATCH);

    if (error) throw new Error(error.message);
    if (!pending?.length) return json({ ok: true, processed: 0 });

    let processed = 0;
    const countryByUser = new Map<string, { code: string; at: string }>();

    for (const row of pending) {
      const point = parseGeoJSONPoint(row.geom);
      if (!point) continue;

      const place = await lookup(point.lng, point.lat);
      if (!place) continue;

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

    return json({ ok: true, processed, countriesUpdated: countryByUser.size });
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
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { 'User-Agent': Deno.env.get('NOMINATIM_USER_AGENT') ?? 'sentinela-dev/0.1' } },
    );
    if (!res.ok) return null;
    const d = await res.json();
    const cc = d?.address?.country_code;
    if (!cc) return null;
    return {
      country_code: String(cc).toUpperCase().slice(0, 2),
      region: d.address.state ?? null,
      city: d.address.city ?? d.address.town ?? d.address.village ?? null,
    };
  } catch {
    return null;
  }
}

/** PostgREST devolve geography como GeoJSON ou WKB hex, dependendo da config. */
function parseGeoJSONPoint(geom: unknown): { lng: number; lat: number } | null {
  if (typeof geom === 'object' && geom !== null && 'coordinates' in geom) {
    const c = (geom as { coordinates: [number, number] }).coordinates;
    return { lng: c[0], lat: c[1] };
  }
  return null;
}
