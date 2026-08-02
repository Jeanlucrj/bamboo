import { useState } from 'react';
import { ScrollView, View, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { stopBackgroundTracking } from '../../src/services/location/backgroundLocation';
import { spacing, useColors } from '../../src/theme';
import { Tela, Rotulo, Paragrafo, Botao, Aviso, Campo, useInputStyle } from '../../src/components/Ui';

export default function Apagar() {
  const router = useRouter();
  const c = useColors();
  const input = useInputStyle();
  const [confirmacao, setConfirmacao] = useState('');
  const [apagando, setApagando] = useState(false);

  const podeApagar = confirmacao.trim().toUpperCase() === 'APAGAR';

  async function apagarLocalizacao() {
    setApagando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setApagando(false);
      Alert.alert('Sessão expirada', 'Entre novamente.');
      return;
    }

    const { error } = await supabase.from('location_logs').delete().eq('user_id', user.id);
    setApagando(false);

    if (error) Alert.alert('Não foi possível apagar', error.message);
    else {
      Alert.alert(
        'Histórico apagado',
        'Seus pontos de GPS foram removidos. Os agregados do diário permanecem — eles não permitem reconstituir trajeto.',
      );
      setConfirmacao('');
    }
  }

  function apagarTudo() {
    Alert.alert(
      'Apagar tudo?',
      'Remove viagens, localizações, sinais, contatos e dossiê médico. Não tem desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            setApagando(true);
            // Para o rastreamento antes: deixar a task viva depois de apagar
            // a conta faria o app continuar tentando enviar ping órfão.
            await stopBackgroundTracking().catch(() => {});

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setApagando(false); return; }

            // O ON DELETE CASCADE do profile leva junto viagens, localizações,
            // sinais, contatos, dossiê e alertas.
            const { error } = await supabase.from('profiles').delete().eq('id', user.id);
            setApagando(false);

            if (error) { Alert.alert('Não foi possível apagar', error.message); return; }

            await supabase.auth.signOut();
            router.replace('/(onboarding)/bem-vindo');
          },
        },
      ],
    );
  }

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Rotulo>Apagar só o histórico de localização</Rotulo>
        <Paragrafo>
          Remove todos os pontos de GPS já registrados. Sua conta, contatos e dossiê continuam.
          Os agregados do diário de bordo — países, quilômetros, cidades — permanecem, porque não
          permitem reconstituir por onde você passou.
        </Paragrafo>

        <View style={{ height: spacing.md }} />
        <Campo label="Digite APAGAR para confirmar">
          <TextInput
            style={input}
            value={confirmacao}
            onChangeText={setConfirmacao}
            autoCapitalize="characters"
            placeholder="APAGAR"
            placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Botao
          label="Apagar histórico de localização"
          tom="perigo"
          onPress={apagarLocalizacao}
          ocupado={apagando}
          desabilitado={!podeApagar}
        />

        <View style={{ height: spacing.xl }} />

        <Rotulo>Apagar tudo</Rotulo>
        <Aviso tom="perigo" titulo="Isto não tem desfazer">
          Remove viagens, localizações, sinais, contatos e dossiê médico. A conta de acesso em si
          precisa ser removida pelo suporte — apagá-la daqui exigiria uma chave de administração
          que não pode existir dentro de um aplicativo.
        </Aviso>

        <View style={{ height: spacing.md }} />
        <Botao label="Apagar todos os meus dados" tom="perigo" onPress={apagarTudo} ocupado={apagando} />

        <View style={{ height: spacing.lg }} />
        <Paragrafo>
          Independente disso, a localização bruta é apagada automaticamente após 24 meses por uma
          rotina semanal.
        </Paragrafo>
      </ScrollView>
    </Tela>
  );
}
