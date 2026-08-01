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

export const emergencyContactInput = z
  .object({
    full_name: z.string().min(2).max(120),
    relationship: z.string().max(60).optional(),
    email: z.string().email().optional().or(z.literal('')),
    // E.164: sem isso o Twilio recusa metade dos números internacionais.
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use o formato internacional: +5511999999999').optional().or(z.literal('')),
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

