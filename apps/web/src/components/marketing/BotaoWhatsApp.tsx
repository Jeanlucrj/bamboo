'use client';

import { useEffect, useRef } from 'react';
import { WHATSAPP_CONTATO } from '@/content/landing';

/**
 * Botão flutuante de WhatsApp — canto inferior direito.
 *
 * "Flutuante" aqui não é só `position: fixed`. Fixo ele já estava, e por isso
 * parecia parado: acompanhava a tela sem nunca se mexer, indistinguível de um
 * adesivo colado no vidro. Agora ele flutua de verdade —
 *
 *   em repouso   sobe e desce devagar, 3,2 s por ciclo. É o que faz o olho
 *                registrar que aquilo é um objeto solto sobre a página, e não
 *                parte do layout.
 *   rolando      desloca no sentido da rolagem, como se tivesse inércia, e
 *                volta suavemente ao lugar quando a página para.
 *
 * O deslocamento é proporcional à VELOCIDADE, não à posição: rolagem lenta mal
 * o move, rolagem rápida joga mais. Amarrar à posição faria ele saltar em
 * rolagem por barra, onde o salto é grande e instantâneo.
 *
 * A física roda em `requestAnimationFrame` com interpolação, e não em
 * transição CSS a cada evento: `scroll` dispara dezenas de vezes por segundo, e
 * reiniciar a transição a cada disparo produz tremor em vez de movimento.
 *
 * Nada disso acontece com `prefers-reduced-motion`. Movimento perpétuo na
 * periferia da visão é gatilho de enjoo para quem tem sensibilidade
 * vestibular, e o botão precisa continuar utilizável para essa pessoa.
 */
export function BotaoWhatsApp() {
  const ref = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let alvo = 0; // para onde a inércia está puxando
    let atual = 0; // onde está agora
    let ultimoY = window.scrollY;
    let quadro = 0;
    let parado = 0;

    function aoRolar() {
      const y = window.scrollY;
      const delta = y - ultimoY;
      ultimoY = y;

      // Teto de 22 px: sem ele, um "fim da página" pela barra de rolagem
      // arremessaria o botão para fora da tela.
      alvo = Math.max(-22, Math.min(22, delta * 0.55));

      clearTimeout(parado);
      parado = window.setTimeout(() => {
        alvo = 0;
      }, 120);
    }

    function animar() {
      // Interpolação exponencial: aproxima 12% da distância por quadro. Dá o
      // amortecimento de mola sem precisar simular mola.
      atual += (alvo - atual) * 0.12;
      if (Math.abs(atual) < 0.01) atual = 0;
      el!.style.setProperty('--deslocamento', `${atual.toFixed(2)}px`);
      quadro = requestAnimationFrame(animar);
    }

    window.addEventListener('scroll', aoRolar, { passive: true });
    quadro = requestAnimationFrame(animar);

    return () => {
      window.removeEventListener('scroll', aoRolar);
      cancelAnimationFrame(quadro);
      clearTimeout(parado);
    };
  }, []);

  const texto = encodeURIComponent('Olá! Vim pelo site do Sentinela e tenho uma dúvida.');

  return (
    // Invólucro carrega a física; o link carrega a aparência. Separar evita
    // que o `scale` do hover brigue com o `translateY` da animação — duas
    // regras mexendo no mesmo `transform` se sobrescrevem.
    <div
      className="fixed right-6 z-50 flutuante"
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
    >
      <a
        ref={ref}
        href={`https://wa.me/${WHATSAPP_CONTATO.numero}?text=${texto}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="inercia group flex items-center gap-0 rounded-full bg-[#25D366] shadow-lg shadow-black/40 transition-[gap,padding,box-shadow] duration-300 hover:gap-2 hover:pr-5 hover:shadow-2xl hover:shadow-[#25D366]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b14]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center">
          {/* Glifo oficial em SVG inline: não depende de CDN (bloqueado pela
              CSP em produção), não borra em tela de alta densidade e não custa
              uma requisição. */}
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="#ffffff"
            aria-hidden
            className="transition-transform duration-300 group-hover:scale-110"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.464 3.488" />
          </svg>
        </span>

        {/* O rótulo cresce no hover em vez de ficar sempre aberto: parado, o
            botão é só o ícone e não rouba área de leitura da página. */}
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold text-white opacity-0 transition-all duration-300 group-hover:max-w-[10rem] group-hover:opacity-100">
          Tirar uma dúvida
        </span>
      </a>
    </div>
  );
}
