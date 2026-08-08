import { z } from 'zod';

/** Payload de um ping de GPS enviado pelo app em lote. */
export const pingSchema = z.object({
  client_ping_id: z.string().uuid(),
  session_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().nonnegative().nullable().optional(),
  altitude_m: z.number().nullable().optional(),
  speed_mps: z.number().nullable().optional(),
  battery_level: z.number().min(0).max(1).nullable().optional(),
  is_moving: z.boolean().optional(),
  recorded_at: z.string().datetime(),
});
export type Ping = z.infer<typeof pingSchema>;

export const pingBatchSchema = z.array(pingSchema).min(1).max(200);

export const travelSessionInput = z.object({
  title: z.string().min(2, 'Dê um nome para a viagem').max(120),
  destination_label: z.string().max(160).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  checkin_hours: z.number().int().min(1).max(720),
  grace_hours: z.number().min(0).max(24).default(2),
  /** Deslocamento detectado pelo GPS conta como sinal de vida automático. */
  passive_checkin_enabled: z.boolean().default(true),
  gps_tracking_enabled: z.boolean().default(true),
  movement_threshold_m: z.number().int().min(50).max(10000).default(150),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
export type TravelSessionInput = z.infer<typeof travelSessionInput>;

/** E.164 — o formato que todo gateway de SMS/WhatsApp exige na entrega. */
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Põe o telefone em E.164 antes de validar.
 *
 * A validação antiga era só a regex acima, aplicada ao que a pessoa digitou.
 * Resultado: `+55 11 97718-3338` era recusado com "use o formato
 * internacional" — sendo que o número ESTÁ em formato internacional. O que a
 * regex não aceitava era o espaço e o hífen, que é exatamente como um número
 * é escrito em todo lugar: no contato do celular, no cartão, no WhatsApp.
 *
 * Ninguém digita `+5511977183338` colado. Exigir isso e chamar de "formato
 * internacional" é pedir uma coisa e nomear outra — e o preço aqui é alto,
 * porque um contato de emergência que a pessoa desiste de cadastrar é um
 * alarme que dispara sem ter para quem ligar.
 *
 * O que fazemos:
 *
 *   pontuação      espaço, hífen, parênteses e ponto somem sempre. Não há
 *                  ambiguidade nenhuma nisso.
 *   prefixo 00     é o código internacional discado em boa parte do mundo
 *                  (`0055 11…`), então vira `+`.
 *   sem código     10 ou 11 dígitos é telefone brasileiro com DDD — fixo ou
 *                  celular com o 9. O app é pt-BR, então assumimos +55.
 *
 * O último caso é o único que envolve suposição, e por isso a tela mostra o
 * número já normalizado embaixo do campo ANTES de salvar. Adivinhar o país
 * errado em silêncio mandaria o alerta para um desconhecido — mostrar o
 * resultado transforma a suposição em algo que a pessoa confere num relance.
 */
export function normalizarTelefone(bruto: unknown): string {
  if (typeof bruto !== 'string') return '';

  const cru = bruto.trim();
  if (!cru) return '';

  const comMais = cru.startsWith('+') ? cru : cru.replace(/^00\s*/, '+');
  const digitos = comMais.replace(/\D/g, '');
  if (!digitos) return cru; // devolve o original para o erro citar o que foi digitado

  if (comMais.startsWith('+')) return `+${digitos}`;
  if (digitos.length === 10 || digitos.length === 11) return `+55${digitos}`;

  // Sem `+` e sem cara de número brasileiro: não inventamos país. A regex
  // recusa e a mensagem explica o que falta.
  return digitos;
}

export const emergencyContactInput = z
  .object({
    full_name: z.string().min(2, 'Escreva o nome completo').max(120),
    relationship: z.string().max(60).optional(),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    phone: z.preprocess(
      normalizarTelefone,
      z
        .string()
        .regex(E164, 'Inclua o código do país. Ex.: +55 11 97718-3338')
        .optional()
        .or(z.literal('')),
    ),
    preferred_channel: z.enum(['email', 'sms', 'whatsapp']).default('email'),
    locale: z.string().default('pt-BR'),
    priority: z.number().int().min(1).max(10).default(1),
  })
  .refine((v) => !!v.email || !!v.phone, {
    message: 'Informe pelo menos um e-mail ou telefone',
    path: ['email'],
  })
  .refine((v) => v.preferred_channel === 'email' || !!v.phone, {
    message: 'Canal por SMS/WhatsApp exige telefone',
    path: ['phone'],
  });
export type EmergencyContactInput = z.infer<typeof emergencyContactInput>;

export const dossierInput = z.object({
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().max(500).optional(),
  medications: z.string().max(500).optional(),
  medical_conditions: z.string().max(1000).optional(),
  passport_masked: z.string().max(8).optional(),
  insurance_provider: z.string().max(120).optional(),
  insurance_policy: z.string().max(80).optional(),
  additional_notes: z.string().max(1000).optional(),
});

export const sosInput = z.object({
  session_id: z.string().uuid(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  accuracy_m: z.number().optional(),
  note: z.string().max(280).optional(),
});

