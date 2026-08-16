import { View, Text, Pressable, ActivityIndicator } from 'react-native';

import { spacing, radius, type as typo, useColors } from '../theme';

/**
 * Peças do desenho novo.
 *
 * O que elas têm em comum é a inversão de hierarquia: o VALOR é grande e o
 * RÓTULO é minúsculo em caixa alta. Antes tudo vinha em cartão com borda,
 * título e valor no mesmo peso — uma tela de seis cartões iguais não tem foco,
 * e o olho não sabe onde pousar.
 *
 * Nenhuma delas desenha borda. A superfície se separa do fundo preto por
 * luminosidade, que é o suficiente e não cobra os 2px de contorno em volta de
 * cada elemento.
 */

/** Rótulo minúsculo em caixa alta. */
export function Sobre({ children, cor }: { children: React.ReactNode; cor?: string }) {
  const c = useColors();
  return (
    <Text style={{ ...typo.eyebrow, color: cor ?? c.textFaint }}>
      {String(children).toUpperCase()}
    </Text>
  );
}

/** Superfície sem borda. */
export function Bloco({
  children, padding = spacing.md, cor,
}: {
  children: React.ReactNode;
  padding?: number;
  /** Fundo tingido, para blocos de aviso. */
  cor?: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        backgroundColor: cor ? tingir(cor, 0.12) : c.surface,
        borderRadius: radius.bloco,
        padding,
      }}
    >
      {children}
    </View>
  );
}

export type Metrica = {
  valor: string | number;
  rotulo: string;
  cor?: string;
};

/**
 * Grade de métricas em três colunas.
 *
 * Três é o número certo para a largura de um celular: com dois, sobra espaço e
 * cada valor parece um cartão solitário; com quatro, os rótulos quebram em duas
 * linhas e a grade vira parede de texto. Mais de três métricas viram fileiras.
 *
 * Sem cartão, sem borda, sem divisor: o alinhamento das colunas já agrupa.
 */
export function Metricas({ itens }: { itens: Metrica[] }) {
  const c = useColors();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {itens.map((m) => (
        <View
          key={m.rotulo}
          style={{ width: '33.333%', paddingVertical: 6, paddingRight: 4 }}
        >
          <Text
            style={{ ...typo.metrica, color: m.cor ?? c.text, fontVariant: ['tabular-nums'] }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {m.valor}
          </Text>
          <Text style={{ ...typo.eyebrow, fontSize: 9, color: c.textFaint, marginTop: 2 }}>
            {m.rotulo.toUpperCase()}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Barra segmentada do escalonamento.
 *
 * Cada segmento é um degrau do alarme, com largura proporcional à sua duração.
 * O trecho já percorrido fica sólido na cor do estado; o que ainda vem, ponteado.
 *
 * Isto não existia em lugar nenhum do app. A pessoa via um cronômetro e um
 * estado, mas não tinha como saber QUANTO FALTA até acionarem a família — que é
 * exatamente a pergunta que ela faz quando percebe que esqueceu de fazer
 * check-in.
 */
export function BarraEscada({
  segmentos, ativo, cor,
}: {
  /** Pesos relativos de cada degrau, na ordem. */
  segmentos: number[];
  /** Índice do degrau em curso. Os anteriores contam como percorridos. */
  ativo: number;
  cor: string;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {segmentos.map((peso, i) => (
        <View
          key={i}
          style={{
            flex: Math.max(peso, 0.2),
            height: 4,
            borderRadius: radius.pill,
            backgroundColor: i <= ativo ? cor : c.surfaceAlt,
            opacity: i < ativo ? 0.55 : 1,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Degrau do escalonamento, com faixa colorida à esquerda.
 *
 * Copiado do calendário de treinos da referência, onde cada tipo de sessão tem
 * sua cor numa barra vertical. Aqui a cor é a mesma do estado correspondente na
 * aba Segurança, então verde/âmbar/vermelho querem dizer a mesma coisa nas duas
 * telas.
 */
export function Degrau({
  cor, quando, titulo, descricao,
}: {
  cor: string;
  quando: string;
  titulo: string;
  descricao?: string;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm + 2, paddingVertical: 9 }}>
      <View style={{ width: 4, borderRadius: radius.pill, backgroundColor: cor }} />
      <View style={{ flex: 1 }}>
        <Sobre cor={cor}>{quando}</Sobre>
        <Text style={{ ...typo.small, color: c.text, fontWeight: '700', marginTop: 2 }}>
          {titulo}
        </Text>
        {descricao ? (
          <Text style={{ ...typo.caption, color: c.textMuted, marginTop: 1, lineHeight: 16 }}>
            {descricao}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Botão pílula.
 *
 * `solido` é branco no escuro e preto no claro — o contraste máximo contra o
 * fundo, como o "Pausar" da referência. É o botão da ação principal, e ele
 * fica visível mesmo com a tela na luz do sol.
 */
export function Pilula({
  label, onPress, tom = 'solido', ocupado, desabilitado, flex = 1,
}: {
  label: string;
  onPress?: () => void;
  tom?: 'solido' | 'contorno' | 'sos' | 'perigo';
  ocupado?: boolean;
  desabilitado?: boolean;
  flex?: number;
}) {
  const c = useColors();

  const fundo =
    tom === 'solido' ? c.text : tom === 'sos' ? c.sos : 'transparent';
  const tinta =
    tom === 'solido' ? c.bg : tom === 'sos' ? '#FFFFFF' : tom === 'perigo' ? c.alert : c.text;
  const contorno = tom === 'contorno' ? c.border : tom === 'perigo' ? c.alert : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado || desabilitado || !onPress}
      style={({ pressed }) => ({
        flex,
        height: 52,
        borderRadius: radius.pill,
        backgroundColor: fundo,
        borderWidth: contorno === 'transparent' ? 0 : 1.5,
        borderColor: contorno,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: desabilitado ? 0.4 : pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {ocupado ? (
        <ActivityIndicator color={tinta} />
      ) : (
        <Text style={{ ...typo.small, color: tinta, fontWeight: '800' }}>{label}</Text>
      )}
    </Pressable>
  );
}

/**
 * Seletor segmentado.
 *
 * SUBSTITUI OS CINCO CARTÕES EMPILHADOS do intervalo de check-in, que ocupavam
 * quase 300px de altura para oferecer uma escolha. A dica de cada opção não se
 * perdeu: ela aparece abaixo, referente à opção selecionada — que é a única
 * cuja dica interessa no momento da leitura.
 */
export function Segmentado<T extends string | number>({
  opcoes, valor, onChange, desabilitado,
}: {
  opcoes: { valor: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
  desabilitado?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        backgroundColor: c.surface,
        borderRadius: radius.pill,
        padding: 4,
        opacity: desabilitado ? 0.5 : 1,
      }}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            disabled={desabilitado}
            onPress={() => onChange(o.valor)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: ativo ? c.text : 'transparent',
            }}
          >
            <Text
              style={{
                ...typo.caption,
                fontSize: 13,
                fontWeight: ativo ? '800' : '700',
                color: ativo ? c.bg : c.textMuted,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Linha de ajuste, com o ESTADO à direita.
 *
 * A mudança mais útil do Perfil, e a mais barata. Antes só "Aparência" mostrava
 * valor: para saber se a biometria estava ativa, se as notificações passaram,
 * quantos contatos existiam ou se o dossiê estava preenchido, era preciso abrir
 * oito telas — e num app de segurança, um contato faltando é a diferença entre
 * o sistema funcionar e não funcionar. Com o estado na linha, a pessoa audita a
 * própria cobertura de um relance.
 *
 * O ladrilho colorido atrás do ícone saiu junto com os emojis. Ele existia
 * porque emoji ignora `tintColor` e a cor tinha que vir de um quadrado atrás;
 * com ícone de traço a cor é do próprio traço, e a lista fica mais leve.
 */
export function LinhaAjuste({
  icone, label, descricao, valor, corValor, onPress, destrutivo,
}: {
  /** Já renderizado pela tela, para esta peça não depender do conjunto de ícones. */
  icone: React.ReactNode;
  label: string;
  descricao?: string;
  valor?: string;
  corValor?: string;
  onPress?: () => void;
  destrutivo?: boolean;
}) {
  const c = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 3,
        paddingVertical: 12,
        paddingHorizontal: pressed ? 10 : 0,
        marginHorizontal: pressed ? -10 : 0,
        borderRadius: radius.md,
        backgroundColor: pressed ? c.surface : 'transparent',
      })}
    >
      {icone}
      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.small, color: destrutivo ? c.alert : c.text, fontWeight: '700' }}>
          {label}
        </Text>
        {descricao ? (
          <Text style={{ ...typo.caption, fontSize: 11, color: c.textFaint, marginTop: 1, lineHeight: 15 }}>
            {descricao}
          </Text>
        ) : null}
      </View>
      {valor ? (
        <Text style={{ ...typo.caption, color: corValor ?? c.textMuted, fontWeight: '700' }}>
          {valor}
        </Text>
      ) : null}
      {onPress ? <Text style={{ fontSize: 17, color: c.textFaint }}>›</Text> : null}
    </Pressable>
  );
}

/**
 * Assinatura de quem fez, no pé de cada aba.
 *
 * Aparece ao rolar até o fim, como o rodapé de um site — não ocupa espaço fixo
 * na tela nem compete com o conteúdo. Centralizada, minúscula e apagada: a
 * marca do produto é o Sentinela, e esta linha diz de quem ele é, não o que a
 * pessoa deve olhar.
 *
 * Sem link: um link no rodapé promete um site pronto do outro lado, e link
 * quebrado desgasta mais confiança do que assinatura sem link.
 */
export function Assinatura() {
  const c = useColors();
  return (
    <Text
      style={{
        ...typo.caption,
        fontSize: 11,
        color: c.textFaint,
        textAlign: 'center',
        marginTop: spacing.xl,
        opacity: 0.7,
      }}
    >
      Red Sun Tecnologia
    </Text>
  );
}

/** Texto de rodapé. Pequeno, mas nunca ausente — é onde moram as ressalvas. */
export function Nota({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ ...typo.caption, fontSize: 11, color: c.textFaint, lineHeight: 16 }}>
      {children}
    </Text>
  );
}

/** Hex -> rgba. Evita depender de biblioteca de cor só para isso. */
export function tingir(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
