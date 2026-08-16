import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';

/**
 * Busca e APLICA a atualização pelo ar na mesma abertura.
 *
 * O comportamento padrão do expo-updates engana: ao abrir, ele checa, baixa em
 * segundo plano e guarda — mas só ATIVA o pacote novo na abertura SEGUINTE. Na
 * prática é preciso abrir o app duas vezes para ver qualquer correção, sem
 * nada na tela dizendo isso. Quem abre uma vez conclui, com razão, que a
 * atualização não chegou.
 *
 * Aqui a aplicação acontece na hora, durante a tela de abertura — que já
 * existe e já segura alguns segundos. O usuário não vê etapa nova; vê o app
 * abrir já corrigido.
 *
 * `reloadAsync` reinicia o runtime JS. Chamar isso com o app em uso jogaria a
 * pessoa de volta para o início sem aviso, então só rodamos na partida.
 */
export async function aplicarAtualizacaoNaAbertura(): Promise<boolean> {
  // Falso em desenvolvimento e em build sem canal configurado. Sem esta
  // guarda, cada recarregamento do Metro tentaria buscar atualização.
  if (!Updates.isEnabled) return false;

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync(); // não retorna: o runtime reinicia aqui
    return true;
  } catch (e) {
    // Rede ruim, servidor fora, pacote corrompido: seguir com o que já está
    // instalado. Um app de emergência não pode ficar preso numa tela de
    // abertura porque a atualização falhou.
    console.warn('[sentinela] atualização não aplicada:', e);
    return false;
  }
}

/**
 * APLICA O PACOTE QUE A CAMADA NATIVA JÁ BAIXOU.
 *
 * Conserta o bug que fazia a atualização continuar chegando só na abertura
 * seguinte — exatamente o que `aplicarAtualizacaoNaAbertura` existe para
 * evitar, e que ela sozinha não resolvia.
 *
 * O app.json tem `checkAutomatically: ON_LOAD` e `fallbackToCacheTimeout` de
 * 8 s. Isso faz o lado NATIVO checar e baixar a atualização antes de existir
 * qualquer JavaScript, deixando-a engatilhada para a próxima partida. Quando o
 * nosso código rodava logo depois, `checkForUpdateAsync()` respondia
 * `isAvailable: false` — não porque não houvesse novidade, mas porque a
 * novidade JÁ ESTAVA BAIXADA. A função saía no primeiro `if`, `reloadAsync()`
 * nunca era chamado, e o pacote novo só entrava no lançamento seguinte.
 *
 * Era invisível de fora: publicávamos, o usuário abria, nada mudava, e a única
 * explicação plausível parecia ser "a atualização não chegou".
 *
 * `isUpdatePending` só existe no hook `useUpdates()` — não há constante
 * equivalente em `Updates.*` nesta versão —, então isto precisa ser um hook.
 *
 * `ativo` é a guarda que impede o recarregamento com o app EM USO: uma busca
 * em segundo plano pode terminar dez minutos depois da abertura, e reiniciar o
 * runtime nesse momento jogaria a pessoa de volta ao início sem aviso. Num app
 * de emergência isso pode acontecer no meio de um SOS.
 */
export function useAplicarAtualizacaoBaixada(ativo: boolean): void {
  const { isUpdatePending } = useUpdates();

  useEffect(() => {
    if (!ativo || !isUpdatePending || !Updates.isEnabled) return;
    Updates.reloadAsync().catch((e) => {
      console.warn('[sentinela] recarregamento não aplicado:', e);
    });
  }, [ativo, isUpdatePending]);
}

/** Identificação do pacote em execução, para a tela de perfil. */
export function versaoEmExecucao(): { id: string; canal: string; embutido: boolean } {
  return {
    id: Updates.updateId?.slice(0, 8) ?? 'embutido',
    canal: Updates.channel ?? 'desenvolvimento',
    embutido: Updates.isEmbeddedLaunch,
  };
}
