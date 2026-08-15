import { useCallback, useState } from 'react';
import { ScrollView, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { PLANS, formatarPreco } from '@sentinela/shared';

import { supabase } from '../../src/services/supabase';
import { stopBackgroundTracking } from '../../src/services/location/backgroundLocation';
import { revokeThisDevice } from '../../src/services/device';
import { MarcaCompleta } from '../../src/components/Marca';
import { AvatarGrande } from '../../src/components/Identidade';
import { Icone, type NomeIcone } from '../../src/components/Icone';
import { Sobre, Bloco, Metricas, Pilula, BarraEscada, LinhaAjuste, Nota } from '../../src/components/Pecas';
import { useTravelStats, useTripHistory } from '../../src/hooks/useTravelStats';
import { useResumoProtecao } from '../../src/hooks/useResumoProtecao';
import { bloqueioAtivo } from '../../src/services/bloqueio';
import { versaoEmExecucao } from '../../src/services/atualizacao';
import { spacing, type as typo, useColors, useTheme } from '../../src/theme';

const NOME_TEMA = { dark: 'Escuro', light: 'Claro', system: 'Sistema' } as const;

type Plano = {
  viagens_usadas: number;
  viagens_gratis: number;
  assinante: boolean;
  plano: string;
};

export default function PerfilScreen() {
  const router = useRouter();
  const c = useColors();
  const { pref } = useTheme();
  const versao = versaoEmExecucao();

  const { stats } = useTravelStats();
  const { trips } = useTripHistory();
  const { resumo } = useResumoProtecao();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [biometria, setBiometria] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      supabase.rpc('meu_plano').then(({ data }) => {
        if (vivo) setPlano(((data ?? [])[0] as Plano) ?? null);
      });
      bloqueioAtivo().then((v) => vivo && setBiometria(v));
      return () => {
        vivo = false;
      };
    }, []),
  );

  function sair() {
    Alert.alert(
      'Sair da conta?',
      'A sessão é destruída e voltar exigirá um link novo por e-mail. Se é só para fechar o app, não precisa: basta sair — a biometria abre da próxima vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair mesmo assim',
          style: 'destructive',
          onPress: async () => {
            // Ordem importa: parar a task antes de derrubar a sessão. Ao
            // contrário, ela continua acordando e tentando enviar ping com um
            // token que já não vale.
            await stopBackgroundTracking().catch(() => {});
            await revokeThisDevice().catch(() => {});
            await supabase.auth.signOut();
          },
        },
      ],
    );
  }

  const restantes = plano ? Math.max(0, plano.viagens_gratis - plano.viagens_usadas) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl }}>
        {/* O logo, que não aparecia em nenhuma das quatro abas. */}
        <MarcaCompleta />

        <View style={{ marginTop: spacing.lg }}>
          <AvatarGrande />
        </View>

        {/* A pessoa abre o Perfil e vê o que construiu, não uma lista de
            configurações. Os três números já existiam no Diário; aqui eles
            respondem "vale a pena manter isso?" na tela onde se cancela. */}
        <View style={{ marginTop: spacing.lg }}>
          <Metricas
            itens={[
              { valor: trips.length, rotulo: 'Viagens' },
              { valor: stats?.countries_count ?? 0, rotulo: 'Países' },
              { valor: stats?.days_tracked ?? 0, rotulo: 'Dias protegido' },
            ]}
          />
        </View>

        {/* O PLANO SOBE PARA A TELA.
            Antes "1 de 2 viagens grátis" só existia atrás de um toque em
            "Assinatura". Quem não vê o limite chegando não assina — descobre no
            bloqueio, na hora de criar a viagem, e desiste. */}
        {plano ? (
          <View style={{ marginTop: spacing.lg }}>
            <Bloco>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Sobre>Seu plano</Sobre>
                <Text
                  style={{
                    ...typo.caption,
                    fontWeight: '800',
                    color: plano.assinante ? c.safe : c.brandLight,
                  }}
                >
                  {plano.assinante ? 'Sentinela' : 'Teste grátis'}
                </Text>
              </View>

              {plano.assinante ? (
                <Text style={{ ...typo.body, color: c.text, fontWeight: '700', marginTop: 5 }}>
                  Viagens ilimitadas
                </Text>
              ) : (
                <>
                  <Text style={{ ...typo.body, color: c.text, fontWeight: '700', marginTop: 5 }}>
                    {plano.viagens_usadas} de {plano.viagens_gratis} viagens usadas
                  </Text>
                  <View style={{ marginTop: 9 }}>
                    <BarraEscada
                      segmentos={Array.from({ length: plano.viagens_gratis }, () => 1)}
                      ativo={plano.viagens_usadas - 1}
                      cor={restantes === 0 ? c.grace : c.safe}
                    />
                  </View>
                  <View style={{ marginTop: spacing.md }}>
                    <Pilula
                      label={`Assinar por ${formatarPreco(PLANS.sentinela.price)}/mês`}
                      onPress={() => router.push('/perfil/assinatura')}
                    />
                  </View>
                </>
              )}
            </Bloco>
          </View>
        ) : null}

        {/* Os 13 itens continuam todos aqui, nos mesmos seis grupos e na mesma
            ordem. O que mudou é o ícone e o estado à direita. */}

        <Grupo titulo="Sua conta" />
        <LinhaAjuste
          icone={<Ico nome="identidade" cor={c.brandLight} />}
          label="Meus dados"
          descricao="Nome, telefone e país de origem"
          onPress={() => router.push('/perfil/dados')}
        />

        <Grupo titulo="Segurança" />
        <LinhaAjuste
          icone={<Ico nome="contatos" cor={c.safe} />}
          label="Contatos de emergência"
          descricao="Quem é avisado se você sumir"
          valor={String(resumo.contatos.length)}
          corValor={resumo.contatos.length === 0 ? c.alert : undefined}
          onPress={() => router.push('/contatos')}
        />
        <LinhaAjuste
          icone={<Ico nome="saude" cor={c.alert} />}
          label="Dossiê médico"
          descricao="O que o socorrista precisa saber"
          valor={resumo.dossiePronto ? 'Preenchido' : 'Vazio'}
          corValor={resumo.dossiePronto ? c.safe : c.grace}
          onPress={() => router.push('/contatos/dossie')}
        />

        <Grupo titulo="Histórico" />
        <LinhaAjuste
          icone={<Ico nome="mala" cor={c.brandLight} />}
          label="Minhas viagens"
          descricao="Datas, quilômetros, países e cidades de cada viagem"
          valor={String(trips.length)}
          onPress={() => router.push('/viagem/historico')}
        />

        <Grupo titulo="Privacidade" />
        <LinhaAjuste
          icone={<Ico nome="olho" cor={c.grace} />}
          label="Quem acessou meu dossiê"
          valor={String(resumo.acessos)}
          onPress={() => router.push('/perfil/acessos')}
        />
        <LinhaAjuste
          icone={<Ico nome="exportar" cor={c.textMuted} />}
          label="Exportar meus dados"
          onPress={() => router.push('/perfil/exportar')}
        />
        <LinhaAjuste
          icone={<Ico nome="lixeira" cor={c.alert} />}
          label="Apagar dados"
          destrutivo
          onPress={() => router.push('/perfil/apagar')}
        />

        <Grupo titulo="Aplicativo" />
        <LinhaAjuste
          icone={<Ico nome="aparencia" cor={c.brandLight} />}
          label="Aparência"
          valor={NOME_TEMA[pref]}
          onPress={() => router.push('/perfil/aparencia')}
        />
        <LinhaAjuste
          icone={<Ico nome="digital" cor={c.safe} />}
          label="Entrar com biometria"
          descricao="Abrir o app com a digital, sem link por e-mail"
          valor={biometria === null ? undefined : biometria ? 'Ativa' : 'Desligada'}
          corValor={biometria ? c.safe : c.textMuted}
          onPress={() => router.push('/perfil/bloqueio')}
        />
        <LinhaAjuste
          icone={<Ico nome="pino" cor={c.safe} />}
          label="Permissões de localização"
          onPress={() => router.push('/(onboarding)/permissoes-localizacao?origem=ajustes')}
        />
        <LinhaAjuste
          icone={<Ico nome="sino" cor={c.grace} />}
          label="Notificações"
          onPress={() => router.push('/(onboarding)/permissoes-notificacao?origem=ajustes')}
        />

        <Grupo titulo="Conta" />
        <LinhaAjuste
          icone={<Ico nome="cartao" cor={c.brandLight} />}
          label="Assinatura"
          valor={plano ? (plano.assinante ? 'Ativa' : 'Teste grátis') : undefined}
          onPress={() => router.push('/perfil/assinatura')}
        />
        {/* Havia aqui um "Bloquear agora", que trancava o app na hora.
            Removido: biometria neste produto serve para ENTRAR, não para
            fechar a porta com a pessoa do lado de fora. Quem quer sair de
            verdade usa a linha abaixo. */}
        <LinhaAjuste
          icone={<Ico nome="porta" cor={c.alert} />}
          label="Sair da conta"
          descricao="Destrói a sessão — volta exige link novo"
          destrutivo
          onPress={sair}
        />

        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Nota>
            Seus dados de localização são apagados automaticamente após 24 meses. Os agregados do
            diário de bordo permanecem — eles não permitem reconstituir trajeto.
          </Nota>
          {/* Identificação do pacote em execução.
              Existe porque "instalei e não mudou nada" é indistinguível de
              "a atualização não chegou" — e sem um número na tela, a única
              saída é adivinhar. `embutido` significa que o app está rodando o
              código que veio no instalador, sem nenhuma atualização aplicada. */}
          <Nota>
            Versão {versao.id}
            {versao.embutido ? ' (do instalador)' : ' (atualizado pelo ar)'} · canal {versao.canal}
          </Nota>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Grupo({ titulo }: { titulo: string }) {
  return (
    <View style={{ marginTop: spacing.lg, marginBottom: 2 }}>
      <Sobre>{titulo}</Sobre>
    </View>
  );
}

/** Tamanho e espessura iguais em toda a lista — é o que a torna regular. */
function Ico({ nome, cor }: { nome: NomeIcone; cor: string }) {
  return <Icone nome={nome} cor={cor} tamanho={19} />;
}
