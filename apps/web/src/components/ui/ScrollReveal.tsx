'use client';

import React, { useEffect, useRef } from 'react';

type Direction = 'up' | 'left' | 'right' | 'scale';

/**
 * Envolve qualquer bloco e anima ao entrar na viewport.
 *
 * Usa IntersectionObserver nativo — sem lib, sem polyfill, ~30 linhas.
 * A animação real mora em globals.css (.scroll-reveal / .revealed) para
 * que a GPU cuide da transição via compositor thread.
 */
export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  once = true,
  className = '',
}: {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  once?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove('revealed');
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const dirClass =
    direction === 'left'
      ? 'scroll-reveal-left'
      : direction === 'right'
        ? 'scroll-reveal-right'
        : direction === 'scale'
          ? 'scroll-reveal-scale'
          : '';

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${dirClass} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Wrapper que aplica stagger animation nos filhos diretos.
 */
export function StaggerReveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`stagger-children ${className}`}>
      {children}
    </div>
  );
}
