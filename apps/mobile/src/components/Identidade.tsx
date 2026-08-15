import { View, Text, Image } from 'react-native';
import { bandeiraEmoji } from '@sentinela/shared';

import { Marca } from './Marca';
import { usePerfilStore, primeiroNome } from '../stores/perfil';
import { spacing, type as typo, useColors } from '../theme';

/**
 * Cabeçalho das abas: logo à esquerda, quem está logado à direita.
 *
 * Nome e bandeira juntos respondem duas perguntas de uma vez: de quem é esta
 * conta, e de onde a pessoa é. Num app que a família também pode abrir no
 * mesmo aparelho, saber qual conta está ativa antes de olhar o cronômetro
 * evita ler o estado errado.
 *
 * A bandeira usa `home_country` e cai para `current_country`. A ordem importa:
 * ao lado do nome, uma bandeira lê como nacionalidade, não como localização —
 * mostrar a Tailândia porque a pessoa está viajando faria parecer que a conta
 * mudou de dono. O `current_country` só entra quando não há país de origem
 * cadastrado, que é o caso de quem nunca preencheu o perfil.
 *
 * O LOGO SEMPRE APARECE, mesmo antes de o perfil carregar.
 *
 * Antes o componente inteiro devolvia `null` enquanto não sabia o nome, e como
 * ele é a primeira coisa das quatro telas, o app abria sem marca nenhuma por
 * alguns quadros. Agora só o lado direito espera: o logo entra junto com a
 * tela, e o nome aparece quando chega.
 *
 * A chapa de fundo do país saiu. Sobre preto puro, um retângulo com borda em
 * volta de duas letras compete com o conteúdo — e a bandeira já é o sinal.
 */
export function Identidade() {
  const c = useColors();
  const perfil = usePerfilStore((s) => s.perfil);

  const nome = primeiroNome(perfil);
  const pais = perfil?.home_country ?? perfil?.current_country ?? null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
      }}
    >
      <Marca tamanho={20} />

      <View style={{ flex: 1 }} />

      {nome ? (
        <Text
          style={{ ...typo.small, color: c.text, fontWeight: '700' }}
          numberOfLines={1}
        >
          {nome}
        </Text>
      ) : null}

      {pais ? (
        // O código do país acompanha a bandeira no rótulo de acessibilidade:
        // emoji de bandeira não é lido por leitor de tela e, em Android antigo,
        // algumas caem para um retângulo com as duas letras.
        <Text style={{ fontSize: 14 }} accessibilityLabel={`País: ${pais}`}>
          {bandeiraEmoji(pais)}
        </Text>
      ) : null}

      {nome ? <Avatar nome={nome} url={perfil?.avatar_url ?? null} /> : null}
    </View>
  );
}

function Avatar({ nome, url, tamanho = 26 }: { nome: string; url: string | null; tamanho?: number }) {
  if (url) {
    return (
      <Image source={{ uri: url }} style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2 }} />
    );
  }
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        // Degradê seria melhor, mas exigiria um Svg por avatar em quatro telas.
        // O teal chapado com tinta preta já dá o contraste que o cinza não dava.
        backgroundColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: tamanho * 0.44, color: '#000', fontWeight: '800' }}>
        {nome.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** Avatar grande do topo do Perfil, onde a identidade é o assunto da tela. */
export function AvatarGrande() {
  const c = useColors();
  const perfil = usePerfilStore((s) => s.perfil);
  const nome = primeiroNome(perfil) || '?';
  const pais = perfil?.home_country ?? perfil?.current_country ?? null;

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Avatar nome={nome} url={perfil?.avatar_url ?? null} tamanho={64} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
        <Text style={{ ...typo.h1, color: c.text }}>{nome}</Text>
        {pais ? (
          <Text style={{ fontSize: 17 }} accessibilityLabel={`País: ${pais}`}>
            {bandeiraEmoji(pais)}
          </Text>
        ) : null}
      </View>
      {perfil?.email ? (
        <Text style={{ ...typo.caption, color: c.textFaint }}>{perfil.email}</Text>
      ) : null}
    </View>
  );
}
