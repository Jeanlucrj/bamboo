/**
 * Marca do Sentinela.
 *
 * A web não tinha logo nenhuma: cada tela escrevia "SENTINELA" em texto, e em
 * três tratamentos diferentes — `gradient-text` no marketing e no admin,
 * `gradient-heading` no painel, e texto puro na tela de login. O app, esse,
 * mostra o anel na abertura e na tela de entrada. Nada batia.
 *
 * O anel é SVG inline em vez do PNG do app por três motivos:
 *
 *   · o PNG tem fundo branco e halo, feitos para a splash — sobre o fundo
 *     escuro do site ele apareceria como um quadrado claro;
 *   · vetor não borra em tela de alta densidade nem em 16px de favicon;
 *   · sem requisição extra, e a marca é o primeiro pixel que a página pinta.
 *
 * O gradiente é o mesmo `--gradient-brand` do globals.css, escrito aqui em
 * coordenadas de objeto para acompanhar o tamanho do desenho.
 */
export function Logo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        {/* id único por tamanho: dois <svg> com o mesmo id de gradiente na
            mesma página fazem o segundo herdar o primeiro. */}
        <linearGradient id={`anel-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="55%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="34"
        stroke={`url(#anel-${size})`}
        strokeWidth="15"
      />
    </svg>
  );
}

/**
 * Marca completa: anel + palavra.
 *
 * `whitespace-nowrap` porque a palavra tem letter-spacing largo e quebrava em
 * duas linhas dentro do cabeçalho estreito do painel.
 */
export function LogoCompleta({
  size = 28,
  texto = 'text-sm',
  className = '',
}: {
  size?: number;
  /** Classe de tamanho da palavra — o anel e o texto crescem juntos. */
  texto?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}>
      <Logo size={size} />
      <span className={`gradient-text font-extrabold tracking-[0.2em] ${texto}`}>
        SENTINELA
      </span>
    </span>
  );
}
