import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Secao, Lista } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'O que o Sentinela coleta, por quanto tempo guarda, quem consegue ver e como apagar tudo.',
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      titulo="Política de Privacidade"
      atualizado="30 de julho de 2026"
      resumo="Este produto guarda onde você esteve e informação sobre sua saúde. Isso exige explicar o que acontece com esses dados sem rodeio."
    >
      <Secao titulo="1. O que coletamos">
        <p>Três conjuntos, com finalidades diferentes:</p>
        <Lista
          itens={[
            'Cadastro: nome, e-mail, telefone e país de origem. Serve para identificar sua conta e para o SMS de aviso antes de um alerta.',
            'Localização: coordenadas do seu celular, precisão, nível de bateria e o horário do aparelho. Coletadas em segundo plano apenas enquanto existe uma viagem ativa com rastreamento ligado.',
            'Dossiê de emergência: tipo sanguíneo, alergias, medicamentos, condições médicas, seguro e os quatro últimos dígitos do passaporte. Preenchimento opcional e inteiramente seu.',
          ]}
        />
        <p>
          O dossiê é <strong className="text-slate-300">dado pessoal sensível</strong> (art. 11 da
          LGPD, art. 9 do GDPR). A base legal para tratá-lo é o seu consentimento explícito, dado no
          momento em que você o preenche, e a proteção da vida — que é exatamente a hipótese em que
          ele é usado.
        </p>
      </Secao>

      <Secao titulo="2. Quem consegue ver">
        <p>
          Isto não é promessa de conduta: são regras aplicadas pelo banco de dados, em toda consulta,
          independentemente do que a aplicação peça.
        </p>
        <Lista
          itens={[
            'Sua localização: só você. Ninguém mais — nem nós — enquanto está tudo bem.',
            'Seu dossiê médico: só você. Nem o gestor da sua organização, nem o suporte, nem um administrador da plataforma consegue lê-lo.',
            'Gestor de organização (plano empresarial): vê seu estado de check-in — verde, amarelo, vermelho. A localização precisa só é liberada quando existe um incidente aberto, e nunca fora dele.',
            'Contatos de emergência: recebem um link com validade quando um alerta dispara. Todo acesso fica registrado e visível para você.',
          ]}
        />
      </Secao>

      <Secao titulo="3. Por quanto tempo guardamos">
        <Lista
          itens={[
            'Localização bruta: 24 meses. Uma rotina automática apaga o que passa disso, semanalmente.',
            'Agregados do diário de bordo (países, quilômetros, cidades): mantidos enquanto a conta existir. Eles não permitem reconstituir seu trajeto.',
            'Links de dossiê: expiram em 7 dias e são revogados assim que o incidente é encerrado.',
            'Registro de acesso ao dossiê: mantido para você poder auditar quem abriu.',
          ]}
        />
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <p>Não vendemos dado a ninguém. Usamos estes operadores para funcionar:</p>
        <Lista
          itens={[
            'Supabase — banco de dados e autenticação.',
            'Resend — envio de e-mail (link de acesso e alertas).',
            'Twilio — SMS e WhatsApp de alerta.',
            'Mapbox — conversão de coordenadas em nome de cidade e país.',
            'Stripe — pagamento. Não recebemos nem armazenamos número de cartão.',
            'Expo — entrega de notificação push.',
          ]}
        />
        <p className="text-sm text-slate-500">
          Os contratos de operador (DPA) com Twilio e Resend estão pendentes de assinatura, assim
          como o registro formal do encarregado de dados. Enquanto isso não estiver concluído, o
          produto não deve operar comercialmente.
        </p>
      </Secao>

      <Secao titulo="5. Seus direitos">
        <p>
          Em <Link href="/conta" className="text-teal-400 hover:text-teal-300">Conta</Link> você
          exporta tudo o que guardamos num arquivo, e apaga tudo com uma confirmação. A exclusão
          remove viagens, localizações, sinais, contatos e dossiê — sem etapa de retenção e sem
          desfazer.
        </p>
        <p>
          O histórico de GPS ponto a ponto não entra na exportação automática por volume; peça ao
          suporte e ele é enviado em lote.
        </p>
      </Secao>

      <Secao titulo="6. Contato">
        <p>
          <a href="mailto:suporte@sentinela.app" className="text-teal-400 hover:text-teal-300">
            suporte@sentinela.app
          </a>
        </p>
      </Secao>
    </LegalPage>
  );
}
