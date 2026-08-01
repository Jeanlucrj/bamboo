'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Número que conta de 0 até o valor alvo ao entrar na viewport.
 *
 * Usa requestAnimationFrame para fluidez. O easing é `ease-out` — começa
 * rápido e desacelera no final, criando sensação de "chegada" natural.
 *
 * Ativado por IntersectionObserver: não conta se o usuário não está vendo.
 */
export function AnimatedCounter({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState<string>(format(0, decimals));
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          animate(value, duration, decimals, setDisplay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}

function animate(
  target: number,
  duration: number,
  decimals: number,
  setDisplay: (v: string) => void,
) {
  const start = performance.now();

  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out: 1 - (1 - t)^3
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;
    setDisplay(format(current, decimals));

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      setDisplay(format(target, decimals));
    }
  }

  requestAnimationFrame(tick);
}

function format(n: number, decimals: number): string {
  if (decimals > 0) return n.toFixed(decimals);
  return Math.round(n).toLocaleString('pt-BR');
}
