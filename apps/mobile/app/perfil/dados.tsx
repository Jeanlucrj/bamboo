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
        {paisEscolhido ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: c.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.brandLight,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ fontSize: 22 }}>{bandeiraEmoji(paisEscolhido.codigo)}</Text>
            <Text style={{ ...typo.body, color: c.text, fontWeight: '700', flex: 1 }}>
              {paisEscolhido.nome}
            </Text>
            <Text style={{ ...typo.caption, color: c.textMuted }}>{paisEscolhido.codigo}</Text>
          </View>
        ) : null}

        <TextInput
          style={input}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar país…"
          placeholderTextColor={c.textFaint}
          autoCapitalize="none"
        />

        {/* Altura fixa em vez de lista inteira: 257 países empurrariam o botão
            de salvar para tão longe que ninguém chegaria nele. */}
        <View
          style={{
            maxHeight: 260,
            marginTop: spacing.sm,

            borderRadius: radius.md,
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled>
            {filtrados.map((p) => {
              const ativo = p.codigo === pais;
              return (
                <Pressable
                  key={p.codigo}
                  onPress={() => {
                    setPais(p.codigo);
                    setBusca('');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 11,
                    backgroundColor: ativo ? c.surfaceAlt : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
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
