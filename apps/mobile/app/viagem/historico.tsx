import { useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { bandeiraEmoji, type TripHistoryItem } from '@sentinela/shared';

import { useTripHistory } from '../../src/hooks/useTravelStats';
import { spacing, radius, type as typo, useColors } from '../../src/theme';
import { Tela, Cartao, Rotulo, Vazio, Aviso, Ladrilho } from '../../src/components/Ui';

/**
 * Histórico de viagens.
 *
 * O Diário de Bordo só tinha o agregado do usuário inteiro: "12 países",
 * "8.400 km", "5 viagens concluídas". Nenhum caminho levava às viagens em si —
 * não dava para ver quais foram, quando, para onde, nem o que cada uma rendeu.
 *
 * Esta tela mostra a viagem MESMO SEM GPS. Uma viagem com o rastreamento
 * desligado tem 0 km e nenhuma cidade, e isso é um fato sobre ela — não motivo
 * para sumir da lista.
 */
export default function HistoricoViagens() {
  const c = useColors();
  const { trips, loading, error, recarregar } = useTripHistory();
  const [atualizando, setAtualizando] = useState(false);

  async function puxar() {
    setAtualizando(true);
    await recarregar();
    setAtualizando(false);
  }

  if (loading) {
    return (
      <Tela>
        <ActivityIndicator style={{ marginTop: 80 }} color={c.brandLight} />
      </Tela>
    );
  }

  const concluidas = trips.filter((t) => t.status !== 'active');
  const ativa = trips.find((t) => t.status === 'active');

  const totalKm = trips.reduce((s, t) => s + Number(t.km ?? 0), 0);
  const totalDias = trips.reduce((s, t) => s + (t.days ?? 0), 0);
  const paises = new Set(trips.flatMap((t) => t.countries ?? []));
  const cidades = new Set(trips.flatMap((t) => t.cities ?? []));

  return (
    <Tela>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={puxar} tintColor={c.brandLight} />
        }
      >
        {error ? (
          <Aviso tom="perigo" titulo="Não conseguimos carregar">
            {error}
          </Aviso>
        ) : null}

        {trips.length === 0 ? (
          <Vazio>
            Nenhuma viagem ainda. Quando você criar a primeira, ela aparece aqui com as datas, os
            quilômetros e as cidades por onde passou.
          </Vazio>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Resumo valor={String(trips.length)} rotulo={trips.length === 1 ? 'viagem' : 'viagens'} />
              <Resumo valor={String(totalDias)} rotulo={totalDias === 1 ? 'dia' : 'dias'} />
            </View>
            <View style={{ height: spacing.sm }} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Resumo valor={formatarKm(totalKm)} rotulo="km" />
              <Resumo
                valor={`${paises.size}/${cidades.size}`}
                rotulo="países / cidades"
              />
            </View>

            {ativa ? (
              <>
                <Rotulo>Em andamento</Rotulo>
                <CartaoViagem viagem={ativa} />
              </>
            ) : null}

            {concluidas.length ? (
              <>
                <Rotulo>{concluidas.length === 1 ? 'Viagem anterior' : 'Viagens anteriores'}</Rotulo>
                <View style={{ gap: spacing.sm }}>
                  {concluidas.map((v) => (
                    <CartaoViagem key={v.id} viagem={v} />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}

        <View style={{ height: spacing.lg }} />
        <Aviso tom="info" titulo="De onde vêm os quilômetros">
          Somamos só deslocamentos reais entre pings: menos de 50 m é tremida de GPS e não conta.
          Uma viagem feita com o rastreamento desligado aparece aqui com 0 km — ela existiu, só não
          foi medida.
        </Aviso>
      </ScrollView>
    </Tela>
  );
}

function CartaoViagem({ viagem }: { viagem: TripHistoryItem }) {
  const c = useColors();
  const [aberto, setAberto] = useState(false);

  const paises = viagem.countries ?? [];
  const cidades = viagem.cities ?? [];
  const emAndamento = viagem.status === 'active';

  return (
    <Cartao destaque={emAndamento ? c.brandLight : undefined}>
      <Pressable onPress={() => setAberto((v) => !v)} style={{ padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ladrilho
            glifo={paises.length ? bandeiraEmoji(paises[0]) : '🧭'}
            cor={emAndamento ? c.safe : c.brandLight}
            tamanho={44}
          />

          <View style={{ flex: 1 }}>
            <Text style={{ ...typo.body, color: c.text, fontWeight: '700' }} numberOfLines={1}>
              {viagem.title}
            </Text>
            <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 2 }}>
              {periodo(viagem.starts_at, viagem.ends_at)}
            </Text>
          </View>

          <Text style={{ fontSize: 18, color: c.textFaint }}>{aberto ? '⌄' : '›'}</Text>
        </View>

        {/* Os três números que resumem a viagem, sempre visíveis. Escondê-los
            atrás do toque faria a lista virar uma pilha de títulos. */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Selo texto={`${viagem.days ?? 0} ${viagem.days === 1 ? 'dia' : 'dias'}`} />
          <Selo texto={`${formatarKm(Number(viagem.km ?? 0))} km`} />
          <Selo
            texto={`${cidades.length} ${cidades.length === 1 ? 'cidade' : 'cidades'}`}
          />
        </View>

        {aberto ? (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {viagem.destination_label ? (
              <Detalhe rotulo="Destino planejado" valor={viagem.destination_label} />
            ) : null}

            <Detalhe
              rotulo="Países"
              valor={
                paises.length
                  ? paises.map((p) => `${bandeiraEmoji(p)} ${p}`).join('   ')
                  : 'nenhum registrado'
              }
            />
            <Detalhe
              rotulo="Cidades"
              valor={cidades.length ? cidades.join(' · ') : 'nenhuma registrada'}
            />
            <Detalhe rotulo="Check-ins manuais" valor={String(viagem.checkins ?? 0)} />
            <Detalhe rotulo="Pontos de GPS" valor={String(viagem.pings ?? 0)} />
            <Detalhe rotulo="Situação" valor={rotuloStatus(viagem.status, viagem.state)} />
          </View>
        ) : null}
      </Pressable>
    </Cartao>
  );
}

function Resumo({ valor, rotulo }: { valor: string; rotulo: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Cartao padding={spacing.md}>
        <Text style={{ ...typo.h1, color: c.brandLight }}>{valor}</Text>
        <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 2 }}>{rotulo}</Text>
      </Cartao>
    </View>
  );
}

function Selo({ texto }: { texto: string }) {
  const c = useColors();
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ ...typo.caption, color: c.textMuted, fontWeight: '600' }}>{texto}</Text>
    </View>
  );
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string }) {
  const c = useColors();
  return (
    <View>
      <Text style={{ ...typo.caption, color: c.textFaint, letterSpacing: 0.6 }}>
        {rotulo.toUpperCase()}
      </Text>
      <Text style={{ ...typo.small, color: c.text, marginTop: 2, lineHeight: 20 }}>{valor}</Text>
    </View>
  );
}

function formatarKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
  if (km >= 10) return String(Math.round(km));
  return km.toFixed(1).replace(/\.0$/, '');
}

function periodo(inicio: string | null, fim: string | null): string {
  if (!inicio) return '—';
  const d = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
  return fim ? `${d(inicio)} — ${d(fim)}` : `desde ${d(inicio)}`;
}

function rotuloStatus(status: string | null, state: string | null): string {
  if (status === 'active') {
    const estados: Record<string, string> = {
      safe: 'em andamento, tudo certo',
      grace: 'em andamento, check-in atrasado',
      warning: 'em andamento, sem sinal há horas',
      alert: 'em andamento, contatos acionados',
      sos: 'em andamento, SOS acionado',
      resolved: 'em andamento, alarme encerrado',
    };
    return estados[state ?? ''] ?? 'em andamento';
  }
  return status === 'completed' ? 'concluída' : (status ?? '—');
}
