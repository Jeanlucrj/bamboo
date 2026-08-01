'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { getInstallId, describeBrowser, describeOS } from '@/lib/device/installId';

/**
 * Registra este navegador como um `device` de plataforma `web`.
 *
 * Sem isto o painel de admin não consegue responder a pergunta que mais importa
 * na operação: "quantos usuários só têm conta pela web?" — ou seja, quantos
 * estão pagando por um Dead Man's Switch que nunca vai disparar porque nunca
 * instalaram o app.
 *
 * O upsert é idempotente por (user_id, install_id): montar de novo só atualiza
 * o last_seen_at. Falha em silêncio de propósito — não conseguir carimbar o
 * heartbeat de um navegador não pode quebrar a página da conta.
 */
export function RegisterWebDevice() {
  useEffect(() => {
    const installId = getInstallId();
    if (!installId) return;

    const ua = navigator.userAgent;
    createBrowserClient()
      .rpc('register_device', {
        p_install_id: installId,
        p_platform: 'web',
        p_model: describeBrowser(ua),
        p_os_version: describeOS(ua),
      })
      .then(({ error }) => {
        if (error) console.warn('[devices] registro do navegador falhou:', error.message);
      });
  }, []);

  return null;
}
