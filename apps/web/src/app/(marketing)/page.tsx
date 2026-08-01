import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { ProblemBlock } from '@/components/marketing/ProblemBlock';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Features } from '@/components/marketing/Features';
import { AudienceSplit } from '@/components/marketing/AudienceSplit';
import { Testimonial } from '@/components/marketing/Testimonial';
import { PricingTable } from '@/components/marketing/PricingTable';
import { Faq } from '@/components/marketing/Faq';
import { FinalCta } from '@/components/marketing/FinalCta';

export const metadata: Metadata = {
  title: 'Sentinela — Se algo acontecer com você lá fora, alguém vai saber',
  description:
    'Dead Man’s Switch para viajantes solo e nômades digitais. Check-in passivo pelas redes, GPS que não come bateria e diário de bordo automático.',
  openGraph: {
    title: 'Sentinela — Viaje sozinho. Nunca desacompanhado.',
    description:
      'Se você sumir, seus contatos recebem sua última localização, dados médicos e os telefones de emergência do país onde você está.',
    type: 'website',
  },
};

/**
 * Landing page — SSG puro.
 * Meta de LCP < 1,2 s: nada de mapa interativo aqui. O hero usa imagem
 * estática + CSS. Carregar Mapbox na home custa ~800 KB e mata a conversão
 * justamente de quem está num 3G de hostel.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProblemBlock />
      <HowItWorks />
      <Features />
      <AudienceSplit />
      <Testimonial />
      <PricingTable />
      <Faq />
      <FinalCta />
    </>
  );
}
