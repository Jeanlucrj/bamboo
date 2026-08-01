import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Secao, Lista } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Segurança e LGPD',
  description:
    'Como o Sentinela protege localização e dado médico: isolamento no banco, acesso por token auditado e retenção com prazo.',
};

export default function SegurancaPage() {
  return (
    <LegalPage
      titulo="Segurança e LGPD"
      atualizado="30 de julho de 2026"
      resumo="As garantias abaixo são aplicadas pelo banco de dados, não pela interface. Um erro na aplicação não as contorna."
    >
      <Secao titulo="Isolamento por linha, não por tela">
        <p>
          Cada tabela com dado de usuário tem política de acesso no próprio banco. A consulta é
          filtrada antes de sair, para qualquer caminho — interface, API ou integração. Esconder um
          botão não é controle de acesso; a política é.
        </p>
      </Secao>

      <Secao titulo="O dossiê médico é o dado mais protegido do sistema">
        <Lista
          itens={[
            'Fica em tabela separada, com política de dono-apenas: nenhuma consulta de terceiro o alcança.',
            'Nem gestor de organização, nem suporte, nem administrador da plataforma consegue lê-lo.',
            'A única saída é um link com token, entregue ao contato de emergência quando um alerta abre.',
            'O token tem validade de 7 dias, é revogado quando o incidente encerra, e cada abertura é registrada com data e origem.',
            'Você vê esse registro em Conta — quem abriu, e quando.',
          ]}
        />
      </Secao>

      <Secao titulo="Localização de colaborador em contexto corporativo">
        <p>
          No plano empresarial, o gestor vê o estado de check-in de cada viajante — verde, amarelo,
          vermelho — e nada além disso. A localização precisa só é liberada enquanto existe um
          incidente aberto.
        </p>
        <p>
          Rastreamento contínuo de colaborador fora de emergência é passivo jurídico, não
          funcionalidade — e é a primeira coisa que derruba a adesão de uma equipe.
        </p>
      </Secao>

      <Secao titulo="Retenção com prazo, não “para sempre”">
        <Lista
          itens={[
            'A localização bruta é apagada automaticamente após 24 meses.',
            'Os agregados do diário permanecem, e não permitem reconstituir trajeto.',
            'A exclusão a pedido é imediata e sem etapa de retenção.',
          ]}
        />
      </Secao>

      <Secao titulo="Administração da plataforma">
        <p>
          O painel interno é auditado: toda busca por usuário e toda ação de escrita ficam
          registradas com autor e horário. O papel de administrador vive em tabela isolada — não é
          um campo do próprio perfil, justamente para que ninguém possa se promover editando os
          próprios dados.
        </p>
      </Secao>

      <Secao titulo="O que ainda falta">
        <p>Sendo direto sobre o que não está pronto:</p>
        <Lista
          itens={[
            'Contratos de operador (DPA) com Twilio e Resend não assinados.',
            'Encarregado de dados não designado formalmente.',
            'Auditoria de segurança independente não realizada.',
            'Os documentos legais deste site ainda não passaram por revisão jurídica.',
          ]}
        />
        <p className="text-sm text-slate-500">
          Enquanto esses itens não forem concluídos, o produto não deve operar comercialmente.
        </p>
      </Secao>

      <Secao titulo="Encontrou uma falha?">
        <p>
          Escreva para{' '}
          <a href="mailto:suporte@sentinela.app" className="text-teal-400 hover:text-teal-300">
            suporte@sentinela.app
          </a>
          . Leia também a{' '}
          <Link href="/privacidade" className="text-teal-400 hover:text-teal-300">
            Política de Privacidade
          </Link>
          .
        </p>
      </Secao>
    </LegalPage>
  );
}
