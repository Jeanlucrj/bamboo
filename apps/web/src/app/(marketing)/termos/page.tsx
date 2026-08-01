import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Secao, Lista } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'O que o Sentinela faz, o que ele não faz e onde estão os limites do serviço.',
};

export default function TermosPage() {
  return (
    <LegalPage
      titulo="Termos de Uso"
      atualizado="30 de julho de 2026"
      resumo="O Sentinela é uma ferramenta de apoio. Entender exatamente onde ele falha é parte de usá-lo com segurança."
    >
      <Secao titulo="1. O que o serviço faz">
        <p>
          O Sentinela monitora sinais de vida vindos do seu celular. Se você ficar mais tempo do que
          o combinado sem dar sinal, ele avisa primeiro você, depois insiste, e só então entrega aos
          seus contatos de emergência sua última localização conhecida, seu dossiê e os telefones de
          emergência do país onde você está.
        </p>
      </Secao>

      <Secao titulo="2. O que ele NÃO é">
        <p className="rounded-xl border border-red-900/50 bg-red-950/20 px-5 py-4 text-red-200/90">
          O Sentinela <strong>não é um serviço de emergência</strong> e não substitui polícia,
          bombeiros, resgate ou seguro viagem. Ele não envia socorro: ele avisa pessoas que você
          escolheu. Em caso de risco imediato, acione as autoridades locais.
        </p>
      </Secao>

      <Secao titulo="3. Limitações que você precisa conhecer antes de confiar">
        <p>Estas não são letras miúdas — são o desenho do produto:</p>
        <Lista
          itens={[
            'Celular parado dispara alarme. Só deslocamento real conta como sinal de vida; um aparelho esquecido no quarto não prova nada. Se você vai passar o dia longe do telefone, faça o check-in manual antes.',
            'O iOS não garante execução periódica em segundo plano. O intervalo de ping é um alvo, não um contrato — o sistema operacional entrega quando pode.',
            'Sem bateria, sem aparelho ou sem rede por muito tempo, o alarme dispara. Isso é o comportamento correto, e vai gerar falso positivo.',
            'Notificação crítica no iOS depende de autorização da Apple. Sem ela, o aviso pode não atravessar o Modo Foco.',
            'A entrega de e-mail, SMS e WhatsApp depende de terceiros e da rede do destinatário. Não garantimos entrega.',
          ]}
        />
      </Secao>

      <Secao titulo="4. Suas responsabilidades">
        <Lista
          itens={[
            'Manter o app instalado, atualizado e com permissão de localização "Sempre".',
            'Manter contatos de emergência cadastrados e avisá-los de que são seus contatos.',
            'Escolher um intervalo de check-in compatível com a sua viagem.',
            'Manter o dossiê médico correto — informação errada ali pode prejudicar quem for te socorrer.',
          ]}
        />
      </Secao>

      <Secao titulo="5. Conta e acesso">
        <p>
          O acesso é por link enviado ao seu e-mail, sem senha. Quem tiver acesso à sua caixa de
          entrada tem acesso à sua conta — proteja seu e-mail com verificação em duas etapas.
        </p>
      </Secao>

      <Secao titulo="6. Planos e pagamento">
        <p>
          O plano gratuito não expira. Os planos pagos são cobrados mensalmente e podem ser
          cancelados a qualquer momento, com acesso mantido até o fim do período já pago. Detalhes em{' '}
          <Link href="/precos" className="text-teal-400 hover:text-teal-300">Preços</Link>.
        </p>
      </Secao>

      <Secao titulo="7. Limitação de responsabilidade">
        <p>
          O serviço é fornecido no estado em que se encontra. Não nos responsabilizamos por dano
          decorrente de falha de entrega de alerta, indisponibilidade de rede, limitação de sistema
          operacional, ou por ação e omissão dos seus contatos de emergência.
        </p>
        <p className="text-sm text-slate-500">
          Esta seção precisa de redação por advogado antes de qualquer operação comercial. O texto
          acima descreve a intenção, não constitui cláusula revisada.
        </p>
      </Secao>

      <Secao titulo="8. Contato">
        <p>
          <a href="mailto:suporte@sentinela.app" className="text-teal-400 hover:text-teal-300">
            suporte@sentinela.app
          </a>
        </p>
      </Secao>
    </LegalPage>
  );
}
