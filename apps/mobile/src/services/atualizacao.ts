import * as Updates from 'expo-updates';

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

/** Identificação do pacote em execução, para a tela de perfil. */
export function versaoEmExecucao(): { id: string; canal: string; embutido: boolean } {
  return {
    id: Updates.updateId?.slice(0, 8) ?? 'embutido',
    canal: Updates.channel ?? 'desenvolvimento',
    embutido: Updates.isEmbeddedLaunch,
  };
}
