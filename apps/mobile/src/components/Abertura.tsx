import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Image, StyleSheet } from 'react-native';

/**
 * Tela de abertura animada.
 *
 * A splash NATIVA (a do app.json) é uma imagem estática que o SO pinta antes
 * de existir qualquer JavaScript — ela não anima, e não há como fazê-la animar.
 * Este componente é a continuação dela: usa a mesma arte e o mesmo fundo, então
 * a troca entre as duas é invisível, e a partir daí o logo ganha vida enquanto
 * a sessão é restaurada.
 *
 * Some sozinho quando `pronto` vira true. A saída é um fade curto com leve
 * escala: corte seco denuncia que eram duas telas diferentes.
 */
/**
 * Tempo mínimo em tela, independente de a sessão já estar pronta.
 *
 * ESTE É O NÚMERO PARA MEXER se a abertura estiver curta ou longa demais.
 *
 * Com a sessão em cache, `pronto` vira true em poucos milissegundos — sem
 * este mínimo a abertura pisca e ninguém vê a animação.
 *
 * Os ciclos, para calibrar com critério em vez de chute:
 *   pulso do halo   2200ms (1100 por metade)
 *   arco em órbita  2600ms por volta
 *
 * 3600ms mostra uma volta completa do arco e mais de um pulso inteiro — é o
 * ponto em que a animação se lê como intencional, não como espera.
 *
 * Acima de ~4s começa a incomodar em uso real: quem abre este app quer saber
 * se o alarme está armado, e cada segundo de logo é um segundo sem resposta.
 */
const MINIMO_MS = 3600;

export function Abertura({ pronto, onFim }: { pronto: boolean; onFim: () => void }) {
  const pulso = useRef(new Animated.Value(0)).current;
  const giro = useRef(new Animated.Value(0)).current;
  const entrada = useRef(new Animated.Value(0)).current;
  const saida = useRef(new Animated.Value(1)).current;
  const [tempoCumprido, setTempoCumprido] = useState(false);

  useEffect(() => {
    // Entrada: o anel cresce do 92% e o texto aparece logo atrás.
    Animated.timing(entrada, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Pulso contínuo do halo — é o que faz o logo parecer "vivo" em vez de
    // parado esperando. Lento de propósito: rápido demais lê como erro.
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(pulso, {
          toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
      ]),
    ).start();

    // Arco girando por fora: sinaliza progresso indeterminado sem precisar de
    // spinner, que destoaria da marca.
    Animated.loop(
      Animated.timing(giro, {
        toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true,
      }),
    ).start();
  }, []);

  // Relógio do tempo mínimo, independente do carregamento.
  useEffect(() => {
    const t = setTimeout(() => setTempoCumprido(true), MINIMO_MS);
    return () => clearTimeout(t);
  }, []);

  // Só sai quando as DUAS condições valem: a sessão resolveu e o tempo mínimo
  // passou. Assim a abertura nunca pisca em aparelho rápido, e nunca segura
  // além do necessário em aparelho lento — nesse caso quem manda é o
  // carregamento, que já terá passado do mínimo.
  useEffect(() => {
    if (!pronto || !tempoCumprido) return;
    Animated.timing(saida, {
      toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(({ finished }) => finished && onFim());
  }, [pronto, tempoCumprido]);

  const escalaHalo = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const opacidadeHalo = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.05] });
  const rotacao = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const escalaLogo = Animated.multiply(
    entrada.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    saida.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }),
  );

  return (
    <Animated.View style={[styles.tela, { opacity: saida }]} pointerEvents="none">
      <View style={styles.centro}>
        {/* Halo pulsante atrás do anel. */}
        <Animated.View
          style={[
            styles.halo,
            { transform: [{ scale: escalaHalo }], opacity: opacidadeHalo },
          ]}
        />

        {/* Arco girando, mais externo que o logo. */}
        <Animated.View style={[styles.orbita, { transform: [{ rotate: rotacao }] }]}>
          <View style={styles.ponto} />
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: escalaLogo }], opacity: entrada }}>
          <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: entrada, alignItems: 'center' }}>
        <Text style={styles.nome}>
          <Text style={styles.nomeLeve}>senti</Text>nela
        </Text>
        <Text style={styles.assinatura}>segurança para quem viaja sozinho</Text>
      </Animated.View>
    </Animated.View>
  );
}

const TAM_LOGO = 132;
const TAM_ORBITA = TAM_LOGO + 54;

const styles = StyleSheet.create({
  tela: {
    ...StyleSheet.absoluteFillObject,
    // Mesmo fundo da splash nativa — é o que torna a troca imperceptível.
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  centro: {
    width: TAM_ORBITA,
    height: TAM_ORBITA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: TAM_LOGO * 1.5,
    height: TAM_LOGO * 1.5,
    borderRadius: TAM_LOGO,
    backgroundColor: '#14B8A6',
  },
  orbita: {
    position: 'absolute',
    width: TAM_ORBITA,
    height: TAM_ORBITA,
    alignItems: 'center',
  },
  ponto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22D3EE',
    marginTop: -3,
  },
  logo: { width: TAM_LOGO, height: TAM_LOGO, resizeMode: 'contain' },
  nome: {
    marginTop: 34,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#F1F5F9',
  },
  nomeLeve: { fontWeight: '300', color: '#94A3B8' },
  assinatura: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: '#475569',
  },
});
