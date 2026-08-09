import { Esqueleto } from '@/components/ui/Esqueleto';

/**
 * Cobre todas as telas do painel: dashboard, viagens, contatos, diário, conta.
 * Sem este arquivo, clicar numa aba deixava a tela anterior parada até o
 * servidor responder — o que faz o app parecer travado, não lento.
 */
export default function Carregando() {
  return <Esqueleto cartoes={4} />;
}
