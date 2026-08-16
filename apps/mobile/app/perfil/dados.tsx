import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { PAISES, bandeiraEmoji, normalizarTelefone } from '@sentinela/shared';

import { supabase } from '../../src/services/supabase';
import { usePerfilStore } from '../../src/stores/perfil';
import { spacing, radius, type as typo, useColors } from '../../src/theme';
import { Tela, Rotulo, Botao, Campo, Aviso, useInputStyle } from '../../src/components/Ui';

/**
 * Meus dados.
 *
 * Esta tela não existia. O app entra por link mágico — só e-mail —, e nome,
 * telefone e país só podiam ser editados no site, em /conta. Quem instalava o
 * app e nunca abria a web ficava sem nenhum deles.
 *
 * O país não é enfeite: é a bandeira ao lado do nome nas abas e a referência
 * de nacionalidade que o contato de emergência lê no dossiê. E não dá para
 * deduzir do e-mail — @gmail.com não diz nada.
 *
 * O telefone também importa mais do que parece: é para ONDE vai o SMS do
 * degrau `warning`, o último aviso que chega ao próprio usuário antes de a
 * família ser acionada.
 */
export default function MeusDados() {
  const c = useColors();
  const router = useRouter();
  const input = useInputStyle();

  const perfil = usePerfilStore((s) => s.perfil);
  const recarregarPerfil = usePerfilStore((s) => s.carregar);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pais, setPais] = useState('');
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);

  /**
   * A lista de países só aparece quando há o que escolher.
   *
   * Antes ela ficava aberta permanentemente: 257 linhas com bandeira, uma
   * atrás da outra, mesmo depois de o país já estar definido. A tela virava
   * uma parede de bandeiras onde a informação que importa — qual país está
   * valendo — se perdia no meio, e o botão "Salvar" ficava atrás de tudo isso.
   *
   * Agora ela abre em dois casos: quando ainda não há país escolhido, ou
   * quando a pessoa toca em "Trocar". Escolher fecha de novo.
   */
  const [escolhendoPais, setEscolhendoPais] = useState(false);

  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.full_name ?? '');
    setPais(perfil.home_country ?? '');
  }, [perfil]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from('profiles')
        .select('phone')
        .eq('id', data.user.id)
        .maybeSingle()
        .then(({ data: p }) => setTelefone(p?.phone ?? ''));
    });
  }, []);

  /**
   * 257 países numa lista rolável é uma tela inútil sem busca. O filtro aceita
   * tanto o nome quanto o código, porque quem sabe "PT" digita "PT" e não quer
   * rolar até a letra P.
   */
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return PAISES;
    return PAISES.filter(
      (p) => p.nome.toLowerCase().includes(t) || p.codigo.toLowerCase() === t,
    );
  }, [busca]);

  async function salvar() {
    if (nome.trim().length < 2) {
      Alert.alert('Nome muito curto', 'Escreva ao menos o primeiro nome.');
      return;
    }

    const fone = normalizarTelefone(telefone);
    if (telefone.trim() && !/^\+[1-9]\d{7,14}$/.test(fone)) {
      Alert.alert('Telefone inválido', 'Inclua o código do país. Ex.: +55 11 97718-3338');
      return;
    }

    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSalvando(false);
      Alert.alert('Sessão expirada', 'Entre novamente.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: nome.trim(),
        phone: fone || null,
        home_country: pais || null,
      })
      .eq('id', user.id);

    setSalvando(false);
    if (error) {
      Alert.alert('Não foi possível salvar', error.message);
      return;
    }

    await recarregarPerfil();
    router.back();
  }

  const paisEscolhido = PAISES.find((p) => p.codigo === pais);

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* O E-MAIL DO CADASTRO, que faltava.
            É a identidade da conta: o link mágico chega nele, e é por ele que
            a pessoa entra. Numa tela chamada "Meus dados" que mostrava nome,
            telefone e país, o dado mais definidor dos quatro era o único
            ausente — e quem usa só o app não tinha onde vê-lo.

            Somente leitura. Trocar o e-mail troca a credencial de acesso e
            exige reconfirmação por link nos dois endereços; oferecer o campo
            aqui insinuaria que basta digitar por cima. */}
        <Campo label="E-mail" hint="É por ele que você entra. Para trocar, fale com o suporte.">
          <View
            style={{
              height: 52,
              backgroundColor: c.surface,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              justifyContent: 'center',
              opacity: 0.75,
            }}
          >
            <Text style={{ ...typo.body, color: c.textMuted }} numberOfLines={1}>
              {perfil?.email ?? '—'}
            </Text>
          </View>
        </Campo>

        <Campo label="Nome completo">
          <TextInput
            style={input}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            maxLength={120}
            placeholder="Como devemos te chamar"
            placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Campo
          label="Telefone"
          hint="Para onde vai o SMS de aviso antes de acionarmos seus contatos"
        >
          <TextInput
            style={input}
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            placeholder="+55 11 97718-3338"
            placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Rotulo>País de origem</Rotulo>

        {/* ESCOLHIDO E FECHADO: uma linha com a bandeira e o nome, mais o botão
            de trocar. É o estado normal da tela — a lista completa é a exceção,
            não o padrão. */}
        {paisEscolhido && !escolhendoPais ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: c.surface,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: 13,
            }}
          >
            <Text style={{ fontSize: 22 }}>{bandeiraEmoji(paisEscolhido.codigo)}</Text>
            <Text style={{ ...typo.body, color: c.text, fontWeight: '700', flex: 1 }}>
              {paisEscolhido.nome}
            </Text>
            <Pressable
              onPress={() => {
                setEscolhendoPais(true);
                setBusca('');
              }}
              hitSlop={10}
            >
              <Text style={{ ...typo.small, color: c.brandLight, fontWeight: '700' }}>Trocar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={input}
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar país…"
              placeholderTextColor={c.textFaint}
              autoCapitalize="none"
              autoFocus={escolhendoPais}
            />

            {/* Altura fixa em vez de lista inteira: 257 países empurrariam o
                botão de salvar para tão longe que ninguém chegaria nele. */}
            <View
              style={{
                maxHeight: 260,
                marginTop: spacing.sm,
                borderRadius: radius.md,
                overflow: 'hidden',
              }}
            >
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filtrados.map((p) => {
                  const ativo = p.codigo === pais;
                  return (
                    <Pressable
                      key={p.codigo}
                      onPress={() => {
                        setPais(p.codigo);
                        setBusca('');
                        // Escolher fecha a lista. Sem isto a tela voltava a ser
                        // uma parede de bandeiras logo depois do toque.
                        setEscolhendoPais(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 11,
                        backgroundColor: ativo ? c.surfaceAlt : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{bandeiraEmoji(p.codigo)}</Text>
                      <Text
                        style={{
                          ...typo.small,
                          color: ativo ? c.text : c.textMuted,
                          fontWeight: ativo ? '700' : '500',
                          flex: 1,
                        }}
                      >
                        {p.nome}
                      </Text>
                      {ativo ? <Text style={{ color: c.brandLight }}>✓</Text> : null}
                    </Pressable>
                  );
                })}
                {filtrados.length === 0 ? (
                  <Text
                    style={{ ...typo.small, color: c.textFaint, padding: spacing.md, textAlign: 'center' }}
                  >
                    Nenhum país com esse nome.
                  </Text>
                ) : null}
              </ScrollView>
            </View>

            {/* Só quando já havia um país: cancelar sem escolher precisa ter
                saída, senão a única forma de fechar é escolher outro. */}
            {paisEscolhido ? (
              <Pressable
                onPress={() => {
                  setEscolhendoPais(false);
                  setBusca('');
                }}
                style={{ paddingVertical: spacing.md, alignItems: 'center' }}
              >
                <Text style={{ ...typo.small, color: c.textFaint }}>Cancelar</Text>
              </Pressable>
            ) : null}
          </>
        )}

        <View style={{ height: spacing.lg }} />
        <Botao label="Salvar" onPress={salvar} ocupado={salvando} />

        <View style={{ height: spacing.lg }} />
        <Aviso tom="info" titulo="Onde isto aparece">
          O país vira a bandeira ao lado do seu nome nas abas e a referência de nacionalidade no
          Dossiê de Emergência. Ele não muda quando você viaja — o país onde você está é detectado
          sozinho pelo GPS.
        </Aviso>
      </ScrollView>
    </Tela>
  );
}
