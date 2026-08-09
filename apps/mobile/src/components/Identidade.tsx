import { View, Text, Image } from 'react-native';
import { bandeiraEmoji } from '@sentinela/shared';

import { usePerfilStore, primeiroNome } from '../stores/perfil';
import { spacing, radius, type as typo, useColors } from '../theme';

/**
 * Identidade do usuário no canto superior esquerdo das abas.
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
 * Enquanto o perfil carrega não renderiza nada, em vez de um esqueleto: são
 * poucos milissegundos e um bloco cinza piscando no topo de quatro telas
 * incomoda mais do que o vazio.
 */
export function Identidade() {
  const c = useColors();
  const perfil = usePerfilStore((s) => s.perfil);

  const nome = primeiroNome(perfil);
  if (!nome) return null;

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
      {perfil?.avatar_url ? (
        <Image
          source={{ uri: perfil.avatar_url }}
          style={{ width: 34, height: 34, borderRadius: 17 }}
        />
      ) : (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typo.small, color: c.brandLight, fontWeight: '800' }}>
            {nome.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={{ ...typo.body, color: c.text, fontWeight: '700' }} numberOfLines={1}>
        {nome}
      </Text>

      {pais ? (
        <View
          style={{
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: radius.sm,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          {/* O código do país acompanha a bandeira: emoji de bandeira não é
              lido por leitor de tela e, em Android antigo, algumas caem para
              um retângulo com as duas letras. */}
          <Text style={{ fontSize: 13 }} accessibilityLabel={`País: ${pais}`}>
            {bandeiraEmoji(pais)} <Text style={{ ...typo.caption, color: c.textMuted }}>{pais}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}
