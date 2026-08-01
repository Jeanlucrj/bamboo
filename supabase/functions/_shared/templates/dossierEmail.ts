export type DossierEmailInput = {
  contactName: string;
  travelerName: string;
  reason: string;
  lastSeenLabel: string;
  lastSeenAt: string;
  dossierUrl: string;
  isSos: boolean;
};

/**
 * Tom deliberadamente calmo e factual. Quem recebe isso está com a mão
 * tremendo — o e-mail precisa dar instrução, não pânico.
 */
export function dossierEmailHtml(i: DossierEmailInput): string {
  const headline = i.isSos
    ? `${i.travelerName} acionou o botão de emergência`
    : `${i.travelerName} não dá sinal de vida há mais tempo do que o combinado`;

  const accent = i.isSos ? '#DC2626' : '#D97706';

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0">
    <tr><td style="background:${accent};padding:20px 28px;color:#fff">
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.9">Sentinela · Alerta de segurança</div>
      <div style="font-size:21px;font-weight:700;margin-top:6px;line-height:1.3">${escape(headline)}</div>
    </td></tr>

    <tr><td style="padding:28px">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Olá, ${escape(i.contactName)}.</p>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">
        ${escape(i.travelerName)} cadastrou você como contato de emergência no Sentinela.
        ${escape(i.reason)}
      </p>

      <table role="presentation" width="100%" style="background:#F1F5F9;border-radius:12px;padding:16px;margin:0 0 24px">
        <tr><td style="font-size:13px;color:#64748B;padding-bottom:4px">Última localização conhecida</td></tr>
        <tr><td style="font-size:17px;font-weight:600">${escape(i.lastSeenLabel)}</td></tr>
        <tr><td style="font-size:13px;color:#64748B;padding-top:4px">${escape(i.lastSeenAt)}</td></tr>
      </table>

      <a href="${i.dossierUrl}" style="display:block;background:#0F766E;color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:600">
        Abrir Dossiê de Emergência
      </a>

      <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#475569">
        No dossiê você encontra o mapa da última posição, o histórico dos últimos 7 dias,
        informações médicas, dados do seguro e os telefones de emergência do país onde
        ${escape(i.travelerName)} está.
      </p>

      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#475569">
        <strong>Se você já falou com ${escape(i.travelerName)} e está tudo bem</strong>,
        abra o link e clique em “Está tudo bem” para encerrar o alerta.
      </p>

      <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;line-height:1.6">
        Este link é pessoal e expira em 7 dias. Não encaminhe.
        Falta de sinal nem sempre significa emergência — pode ser apenas ausência de internet.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

export function dossierSmsText(i: DossierEmailInput): string {
  const head = i.isSos
    ? `EMERGENCIA: ${i.travelerName} acionou o SOS no Sentinela.`
    : `ALERTA: ${i.travelerName} esta sem dar sinal de vida no Sentinela.`;
  return `${head} Ultima posicao: ${i.lastSeenLabel} (${i.lastSeenAt}). Dossie completo: ${i.dossierUrl}`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
