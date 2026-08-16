import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { pedirBiometria } from '../services/bloqueio';
import { useBloqueioStore } from '../stores/bloqueio';
import { DARK } from '../theme/palettes';
import { Marca } from './Marca';

/**
 * Tela de desbloqueio.
 *
 * Aparece quando existe sessão salva e o bloqueio biométrico está ligado. É o
 * que substitui o link mágico na volta ao app: a sessão nunca foi destruída,
 * só estava trancada.
 *
 * Tenta a biometria sozinha ao abrir — pedir um toque antes do prompt seria um
 * passo a mais sem ganho. Se falhar ou for cancelada, oferece tentar de novo,
 * porque cancelamento acidental é comum e ficar preso numa tela morta é pior
 * que a pergunta repetida.
 */
export function TelaBloqueio({ onDesbloquear, onSair }: {
  onDesbloquear: () => void;
  onSair: () => void;
}) {
  const [tentando, setTentando] = useState(true);
  const [falha, setFalha] = useState<'recusado' | 'sem_trava_no_aparelho' | null>(null);
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  async function tentar() {
    setTentando(true);
    setFalha(null);

    // O diálogo do sistema tira o app do primeiro plano. Sem avisar a store,
    // a volta dele seria lida como "entrou de novo" e abriria outro diálogo —
    // laço infinito com o usuário preso do lado de fora.
    useBloqueioStore.getState().marcarAutenticando(true);
    const r = await pedirBiometria('Entrar no Sentinela');
    useBloqueioStore.getState().marcarAutenticando(false);

    setTentando(false);
    if (r.ok) onDesbloquear();
    else setFalha(r.motivo);
  }

  useEffect(() => {
    tentar();
  }, []);

  const escala = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const opacidade = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.05] });

  return (
    <View style={styles.tela}>
      <View style={styles.centro}>
        <Animated.View
          style={[styles.halo, { transform: [{ scale: escala }], opacity: opacidade }]}
        />
        <Marca tamanho={TAM} />
      </View>

      <Text style={styles.titulo}>
        {tentando
          ? 'Entrando…'
          : falha === 'sem_trava_no_aparelho'
            ? 'Este celular não tem trava'
            : falha === 'recusado'
              ? 'Não reconhecemos'
              : 'Bem-vindo de volta'}
      </Text>

      {/* O caso `sem_trava_no_aparelho` é novo, e antes ele não existia porque
          simplesmente destrancava. Se a pessoa removeu a digital e o PIN
          depois de ligar o bloqueio, não há nada a conferir — e a saída
          honesta é dizer isso e mandar recadastrar, não abrir sozinho. */}
      <Text style={styles.corpo}>
        {falha === 'sem_trava_no_aparelho'
          ? 'A digital e o PIN foram removidos das configurações do Android. Cadastre uma das duas para voltar a entrar, ou use outra conta abaixo.'
          : falha === 'recusado'
            ? 'Tente de novo, ou use o PIN do aparelho quando ele oferecer.'
            : 'Sua sessão continua ativa. Confirme que é você e entre — sem link por e-mail.'}
      </Text>

      <View style={styles.acoes}>
        <Pressable style={styles.primario} onPress={tentar} disabled={tentando}>
          <Text style={styles.primarioLabel}>{tentando ? 'Aguardando…' : 'Entrar'}</Text>
        </Pressable>

        {/* Saída de emergência: sem isto, quem trocou de aparelho ou perdeu a
            biometria fica preso numa tela sem alternativa. */}
        <Pressable onPress={onSair} style={styles.secundario}>
          <Text style={styles.secundarioLabel}>Entrar com outra conta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const TAM = 108;

/**
 * Paleta escura fixa, como na `Abertura`.
 *
 * Esta tela nasce por cima da abertura, antes de qualquer conteúdo, e as duas
 * precisam ser o mesmo fundo — a abertura sai com um fade e revela esta, e um
 * degrau de cor no meio desse fade denuncia que eram duas telas empilhadas.
 */
const styles = StyleSheet.create({
  tela: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 998,
  },
  centro: { width: TAM * 1.6, height: TAM * 1.6, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: TAM * 1.4, height: TAM * 1.4, borderRadius: TAM,
    backgroundColor: DARK.brandLight,
  },
  logo: { width: TAM, height: TAM, resizeMode: 'contain' },
  titulo: {
    marginTop: 28, fontSize: 22, fontWeight: '800',
    letterSpacing: -0.5, color: DARK.text, textAlign: 'center',
  },
  corpo: {
    marginTop: 10, fontSize: 14, lineHeight: 21,
    color: DARK.textMuted, textAlign: 'center', maxWidth: 300,
  },
  acoes: { marginTop: 36, width: '100%', maxWidth: 340, gap: 8 },
  // Pílula branca, como o botão principal do resto do app. O teal preenchido
  // era a única coisa dessa forma no produto inteiro depois do redesenho.
  primario: {
    height: 56, borderRadius: 999, backgroundColor: DARK.text,
    alignItems: 'center', justifyContent: 'center',
  },
  primarioLabel: { fontSize: 16, fontWeight: '800', color: '#000000' },
  secundario: { height: 48, alignItems: 'center', justifyContent: 'center' },
  secundarioLabel: { fontSize: 14, fontWeight: '600', color: DARK.textFaint },
});
