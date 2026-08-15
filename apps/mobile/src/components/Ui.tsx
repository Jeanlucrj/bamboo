import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Icone, type NomeIcone } from './Icone';
import { useColors, useTheme } from '../theme';
import { spacing, radius, type as typo } from '../theme';

/**
 * Cores + tema resolvido em uma chamada.
 *
 * Vários componentes precisam saber se estão no claro ou no escuro para
 * calibrar sombra e opacidade de tinta — no claro a mesma sombra do escuro
 * vira uma mancha suja. `useColors` sozinho não entrega essa informação.
 */
function useUi() {
  const { colors, scheme } = useTheme();
  return { c: colors, claro: scheme === 'light' };
}

/**
 * Peças compartilhadas.
 *
 * Os estilos nascem DENTRO do componente, a partir de `useColors()`. Um
 * `StyleSheet.create` no topo do módulo congela as cores no primeiro import e
 * o botão de tema deixa de ter efeito — foi assim que o app inteiro nasceu
 * preso ao escuro.
 */

export function Tela({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>{children}</View>;
}

/**
 * Cartão.
 *
 * SEM BORDA E SEM SOMBRA, e antes tinha as duas mais uma linha de luz no topo.
 *
 * Aquelas três camadas existiam para fazer o bloco parecer objeto sobre um
 * fundo azul-noite que era quase da mesma luminosidade. Sobre preto puro elas
 * viraram ruído: a superfície cinza já se separa sozinha, e o contorno de 1px
 * em volta de cada cartão desenhava uma grade de caixas que é exatamente a
 * aparência de formulário que o desenho novo tira.
 *
 * A sombra continua disponível só no tema claro, onde superfície branca sobre
 * fundo branco realmente precisa de ajuda para se destacar.
 */
export function Cartao({
  children, padding = 0, destaque,
}: {
  children: React.ReactNode;
  padding?: number;
  /** Cor de acento na borda — para o cartão que está pedindo atenção. */
  destaque?: string;
}) {
  const { c, claro } = useUi();

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: radius.bloco,
        // A borda só aparece quando alguém pede destaque explicitamente.
        borderWidth: destaque ? 1 : 0,
        borderColor: destaque,
        padding,
        overflow: 'hidden',
        ...(claro ? sombra() : {}),
      }}
    >
      {children}
    </View>
  );
}

function sombra() {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  });
}

/**
 * Ladrilho de ícone.
 *
 * Quadrado arredondado com fundo tingido na cor do significado. É o elemento
 * que mais muda a percepção de uma lista: sem ele, linhas de texto empilhadas;
 * com ele, itens reconhecíveis por forma e cor antes da leitura.
 */
export function Ladrilho({ glifo, cor, tamanho = 44 }: {
  glifo: string;
  cor?: string;
  tamanho?: number;
}) {
  const { c, claro } = useUi();
  const base = cor ?? c.brandLight;

  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: radius.tile,
        backgroundColor: tingir(base, claro ? 0.12 : 0.16),
        borderWidth: 1,
        borderColor: tingir(base, claro ? 0.22 : 0.28),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: tamanho * 0.44 }}>{glifo}</Text>
    </View>
  );
}

/** Hex -> rgba. Evita depender de biblioteca de cor só para isso. */
function tingir(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function Rotulo({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={{
        ...typo.overline,
        color: c.textFaint,
        marginBottom: spacing.sm,
        marginTop: spacing.xl,
      }}
    >
      {String(children).toUpperCase()}
    </Text>
  );
}

export function Paragrafo({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ ...typo.small, color: c.textMuted, lineHeight: 22 }}>{children}</Text>;
}

export function Titulo({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ ...typo.h2, color: c.text }}>{children}</Text>;
}

/**
 * Botão.
 *
 * PÍLULA, e o primário agora é branco no escuro (preto no claro) em vez de
 * teal. É o contraste máximo contra o fundo — o mesmo recurso do "Pausar" e do
 * "Continuar" da referência —, e sobrevive à tela lida sob sol direto, que é
 * onde um teal médio primeiro desaparece.
 *
 * O teal não sumiu do app: ele continua sendo a cor da marca, do traço da rota
 * no mapa e dos links. Só deixou de ser a cor de "aperte aqui", papel que ele
 * dividia com o significado de marca e desempenhava mal nos dois.
 */
export function Botao({
  label, onPress, tom = 'primario', ocupado, desabilitado, glifo, icone,
}: {
  label: string;
  onPress: () => void;
  tom?: 'primario' | 'perigo' | 'neutro';
  ocupado?: boolean;
  desabilitado?: boolean;
  /** @deprecated Use `icone`. */
  glifo?: string;
  icone?: NomeIcone;
}) {
  const { c } = useUi();
  const fundo = tom === 'primario' ? c.text : tom === 'perigo' ? c.sos : c.surface;
  const cor = tom === 'primario' ? c.bg : tom === 'perigo' ? '#FFFFFF' : c.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado || desabilitado}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: radius.pill,
        backgroundColor: fundo,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        opacity: desabilitado ? 0.4 : pressed ? 0.85 : 1,
        // Escala no toque: o feedback tátil que falta num Pressable cru.
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {ocupado ? (
        <ActivityIndicator color={cor} />
      ) : (
        <>
          {icone ? <Icone nome={icone} cor={cor} tamanho={18} /> : null}
          {!icone && glifo ? <Text style={{ fontSize: 17 }}>{glifo}</Text> : null}
          <Text style={{ ...typo.body, color: cor, fontWeight: '800' }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Linha({
  label, valor, onPress, destrutivo, ultima, glifo, icone, cor, descricao, marcado,
}: {
  label: string;
  valor?: string;
  onPress?: () => void;
  destrutivo?: boolean;
  ultima?: boolean;
  /** @deprecated Use `icone`. Emoji não aceita cor e muda de desenho por aparelho. */
  glifo?: string;
  icone?: NomeIcone;
  cor?: string;
  descricao?: string;
  /**
   * Linha de ESCOLHA, não de navegação.
   *
   * `undefined` mantém o comportamento antigo — chevron, "vai para outro
   * lugar". `true`/`false` trocam o chevron por um marcador de seleção e
   * destacam a opção ativa.
   *
   * A distinção existe porque a tela de Aparência usava a linha de navegação
   * para escolher tema: cada opção aparecia com a seta `›`, como se levasse a
   * outra tela, e a marca de selecionado era um "✓" cinza no lugar do valor —
   * do mesmo tamanho e cor de um texto secundário. Dava para trocar o tema e
   * não perceber qual estava valendo.
   */
  marcado?: boolean;
}) {
  const c = useColors();
  const ehEscolha = marcado !== undefined;

  const conteudo = ({ pressed }: { pressed: boolean }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: icone ? spacing.sm + 3 : spacing.md,
        paddingVertical: glifo || icone ? 13 : spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: c.border,
        backgroundColor: pressed || marcado ? c.surfaceAlt : 'transparent',
      }}
    >
      {/* Ícone de traço sem ladrilho: o quadrado tingido atrás só existia
          porque emoji ignora `tintColor` e a cor precisava vir de algum lugar.
          Com o traço colorido, o ladrilho vira moldura sem função. */}
      {icone ? (
        <Icone nome={icone} cor={destrutivo ? c.alert : cor ?? c.brandLight} tamanho={19} />
      ) : glifo ? (
        <Ladrilho glifo={glifo} cor={destrutivo ? c.alert : cor} tamanho={40} />
      ) : null}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...typo.body,
            color: destrutivo ? c.alert : c.text,
            fontWeight: marcado ? '800' : '600',
          }}
        >
          {label}
        </Text>
        {descricao ? (
          <Text style={{ ...typo.caption, color: c.textFaint, marginTop: 2, lineHeight: 16 }}>
            {descricao}
          </Text>
        ) : null}
      </View>

      {valor ? (
        <Text style={{ ...typo.small, color: c.textMuted, fontWeight: '600' }}>{valor}</Text>
      ) : null}

      {ehEscolha ? (
        // Círculo cheio na cor da marca: lê como escolha à distância, ao
        // contrário do "✓" cinza que se confundia com texto secundário.
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: marcado ? c.brandLight : c.border,
            backgroundColor: marcado ? c.brandLight : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {marcado ? (
            <Text style={{ fontSize: 12, color: c.bg, fontWeight: '900', lineHeight: 14 }}>✓</Text>
          ) : null}
        </View>
      ) : onPress ? (
        <Text style={{ fontSize: 20, color: c.textFaint, marginLeft: 2 }}>›</Text>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress}>{conteudo}</Pressable>
  ) : (
    conteudo({ pressed: false })
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Cartao padding={spacing.lg}>
      <Text style={{ ...typo.small, color: c.textMuted, textAlign: 'center', lineHeight: 22 }}>
        {children}
      </Text>
    </Cartao>
  );
}

export function Aviso({ tom, titulo, children }: {
  tom: 'atencao' | 'perigo' | 'info';
  titulo: string;
  children: React.ReactNode;
}) {
  const { c, claro } = useUi();
  const cor = tom === 'perigo' ? c.alert : tom === 'atencao' ? c.grace : c.brandLight;
  const icone: NomeIcone = tom === 'perigo' ? 'alerta' : tom === 'atencao' ? 'dica' : 'info';

  return (
    <View
      style={{
        // Fundo tingido sem contorno: a cor do fundo já diz o tom, e a borda
        // fazia o aviso parecer um campo de formulário desabilitado.
        backgroundColor: tingir(cor, claro ? 0.09 : 0.12),
        borderRadius: radius.bloco,
        padding: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm + 2,
      }}
    >
      <Icone nome={icone} cor={cor} tamanho={18} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.small, color: c.text, fontWeight: '700' }}>{titulo}</Text>
        <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 3, lineHeight: 18 }}>
          {children}
        </Text>
      </View>
    </View>
  );
}

export function Campo({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ ...typo.caption, color: c.textMuted, marginBottom: 6 }}>{label}</Text>
      {children}
      {hint ? (
        <Text style={{ ...typo.caption, color: c.textFaint, marginTop: 5, lineHeight: 16 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function useInputStyle() {
  const c = useColors();
  return {
    height: 54,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    color: c.text,
    fontSize: 16,
    fontWeight: '500' as const,
  };
}
