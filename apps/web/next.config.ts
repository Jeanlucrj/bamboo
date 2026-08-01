import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  // O pacote shared é TS cru dentro do monorepo — o Next precisa transpilar.
  transpilePackages: ['@sentinela/shared'],

  // Sem isto o Next sobe a árvore procurando lockfile e pode eleger a home do
  // usuário como raiz, quebrando o build trace no deploy.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),

  // Desliga o botão flutuante do Next Dev Tools — o círculo com o "N" no canto
  // inferior esquerdo. Ele só existe em desenvolvimento e jamais iria para
  // produção, mas fica sobreposto à interface e atrapalha avaliar o layout
  // real. Perde-se o painel de rotas e o aviso de erro de hidratação do
  // overlay; os erros continuam no console e no terminal.
  devIndicators: false,

  async headers() {
    return [
      {
        // O dossiê contém dado médico. Nada de cache, nada de indexação,
        // nada de referrer vazando o token para terceiros.
        source: '/d/:token*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default config;
