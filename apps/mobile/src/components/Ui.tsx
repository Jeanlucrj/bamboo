import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
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
 * Três camadas fazem o bloco parecer objeto e não `<div>`: raio grande, uma
 * linha de luz no topo simulando a quina que pega iluminação, e sombra
 * projetada no fundo. Sem a linha de luz o cartão fica chapado; sem a sombra,
 * ele parece recortado no fundo em vez de pousado sobre ele.
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
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: destaque ?? c.border,
        padding,
        overflow: 'hidden',
        ...sombra(claro),
      }}
    >
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          backgroundColor: c.highlight,
        }}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

function sombra(claro: boolean) {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: claro ? 0.06 : 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: claro ? 2 : 6 },
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

export function Botao({
  label, onPress, tom = 'primario', ocupado, desabilitado, glifo,
}: {
  label: string;
  onPress: () => void;
  tom?: 'primario' | 'perigo' | 'neutro';
  ocupado?: boolean;
  desabilitado?: boolean;
  glifo?: string;
}) {
  const { c, claro } = useUi();
  const fundo = tom === 'primario' ? c.brandLight : tom === 'perigo' ? c.alert : c.surface;
  // Tinta escura sobre o teal claro do modo escuro (contraste alto, cara de
  // botão "aceso"); branca sobre o teal escurecido do modo claro.
  const cor = tom === 'neutro' ? c.text : claro ? '#fff' : '#05201D';

  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado || desabilitado}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: radius.lg,
        backgroundColor: fundo,
        borderWidth: tom === 'neutro' ? 1 : 0,
        borderColor: c.border,
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
        <ActivityIndicator color={tom === 'neutro' ? c.text : cor} />
      ) : (
        <>
          {glifo ? <Text style={{ fontSize: 17 }}>{glifo}</Text> : null}
          <Text style={{ ...typo.body, color: tom === 'perigo' ? '#fff' : cor, fontWeight: '800' }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Linha({
  label, valor, onPress, destrutivo, ultima, glifo, cor, descricao,
}: {
  label: string;
  valor?: string;
  onPress?: () => void;
  destrutivo?: boolean;
  ultima?: boolean;
  glifo?: string;
  cor?: string;
  descricao?: string;
}) {
  const c = useColors();

  const conteudo = ({ pressed }: { pressed: boolean }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: glifo ? 12 : spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: c.border,
        backgroundColor: pressed ? c.surfaceAlt : 'transparent',
      }}
    >
      {glifo ? <Ladrilho glifo={glifo} cor={destrutivo ? c.alert : cor} tamanho={40} /> : null}

      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.body, color: destrutivo ? c.alert : c.text, fontWeight: '600' }}>
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
      {onPress ? (
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
  const glifo = tom === 'perigo' ? '⚠️' : tom === 'atencao' ? '💡' : 'ℹ️';

  return (
    <View
      style={{
        backgroundColor: tingir(cor, claro ? 0.08 : 0.1),
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: tingir(cor, 0.3),
        padding: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontSize: 16 }}>{glifo}</Text>
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
