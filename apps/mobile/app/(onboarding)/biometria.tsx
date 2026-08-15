import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  verificarDisponibilidade,
  definirBloqueio,
  pedirBiometria,
  type Disponibilidade,
} from '../../src/services/bloqueio';
import { Icone } from '../../src/components/Icone';
import { spacing, radius, type as typo, useColors } from '../../src/theme';

/**
 * Oferta da biometria — logo depois de o link do e-mail confirmar a entrada.
 *
 * Este é o único instante do produto em que o argumento se explica sozinho: a
 * pessoa ACABOU de esperar um e-mail, abrir, clicar e voltar. Oferecer aqui é
 * dizer "não precisa fazer isso de novo" com a lembrança fresca. Enterrada no
 * Perfil, a opção depende de o usuário procurar uma coisa que ele não sabe que
 * existe — e o custo de não achar é repetir o e-mail para sempre.
 *
 * Aparece uma vez, no primeiro acesso, e nunca mais. Quem pular resolve depois
 * em Perfil > Entrar com biometria.
 *
 * Some sozinha quando o aparelho não tem o que oferecer: sem sensor e sem PIN
 * cadastrado, esta tela seria só um passo a mais sem alternativa.
 */
export default function OfertaBiometria() {
  const c = useColors();
  const router = useRouter();
  const [disp, setDisp] = useState<Disponibilidade | null>(null);
  const [ligando, setLigando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      verificarDisponibilidade().then((d) => {
        if (!vivo) return;
        setDisp(d);
        // Nada a oferecer: segue direto, sem mostrar uma tela que só teria o
        // botão de pular.
        if (!d.disponivel) seguir();
      });
      return () => {
        vivo = false;
      };
    }, []),
  );

  function seguir() {
    router.replace('/(onboarding)/permissoes-localizacao');
  }

  async function ativar() {
    setLigando(true);
    // Confirma ANTES de gravar. Ligar sem testar é trocar a fechadura sem
    // experimentar a chave — o usuário só descobriria que não funciona na
    // próxima abertura, sem entender por quê.
    const r = await pedirBiometria('Confirme para entrar com biometria');
    setLigando(false);

    if (!r.ok) {
      Alert.alert(
        'Não ativamos',
        r.motivo === 'sem_trava_no_aparelho'
          ? 'Este celular não tem digital nem PIN cadastrados. Configure um dos dois no Android e ative depois em Perfil.'
          : 'A confirmação não passou. Você pode ativar depois em Perfil.',
      );
      return;
    }

    await definirBloqueio(true);
    seguir();
  }

  if (!disp) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <ActivityIndicator style={{ marginTop: 120 }} color={c.brandLight} />
      </SafeAreaView>
    );
  }

  const metodo = disp.disponivel ? disp.rotulo : 'Biometria';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}>
        <View style={{ alignItems: 'center' }}>
          <Icone nome="digital" cor={c.safe} tamanho={54} traco={1.3} />
        </View>

        <Text
          style={{
            ...typo.h1, color: c.text, textAlign: 'center',
            marginTop: spacing.lg, lineHeight: 36,
          }}
        >
          Da próxima vez,{'\n'}sem esperar e-mail
        </Text>

        <Text
          style={{
            ...typo.body, color: c.textMuted, textAlign: 'center',
            marginTop: spacing.md, lineHeight: 24,
          }}
        >
          Você acabou de entrar pelo link. Ligando o {metodo.toLowerCase()}, as próximas aberturas
          são imediatas — sua sessão fica salva no aparelho e a digital só confirma que é você.
        </Text>

        <View
          style={{
            marginTop: spacing.xl, backgroundColor: c.surfaceAlt,
            borderRadius: radius.md, padding: spacing.md,
            borderLeftWidth: 3, borderLeftColor: c.brandLight,
          }}
        >
          <Text style={{ ...typo.small, color: c.text, fontWeight: '700' }}>
            Isto não tranca o app
          </Text>
          <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 4, lineHeight: 18 }}>
            A digital é pedida ao abrir e ao voltar de outro aplicativo — nunca no meio do uso. O
            botão de pânico continua a um toque.
          </Text>
        </View>

        <View
          style={{
            marginTop: spacing.md, backgroundColor: c.surfaceAlt,
            borderRadius: radius.md, padding: spacing.md,
            borderLeftWidth: 3, borderLeftColor: c.grace,
          }}
        >
          <Text style={{ ...typo.small, color: c.text, fontWeight: '700' }}>
            Por que não basta o e-mail
          </Text>
          <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 4, lineHeight: 18 }}>
            E-mail não é segredo — está em qualquer lista de contatos. Se ele sozinho abrisse o
            app, quem soubesse seu endereço leria seu tipo sanguíneo, suas alergias e todo o seu
            histórico de localização.
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Pressable
          onPress={ativar}
          disabled={ligando}
          style={{
            height: 56, borderRadius: radius.md, backgroundColor: c.brand,
            alignItems: 'center', justifyContent: 'center', opacity: ligando ? 0.6 : 1,
          }}
        >
          {ligando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ ...typo.body, color: '#fff', fontWeight: '700' }}>
              Ativar {metodo.toLowerCase()}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={seguir}
          style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...typo.small, color: c.textFaint }}>
            Agora não — continuo usando o link por e-mail
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
