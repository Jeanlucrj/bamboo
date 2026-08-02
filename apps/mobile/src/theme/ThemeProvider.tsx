import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES, type Palette, type ThemeName } from './palettes';

const CHAVE = '@sentinela/tema';

/** 'system' segue o aparelho; os outros dois são escolha explícita. */
export type ThemePref = 'system' | ThemeName;

type ThemeCtx = {
  colors: Palette;
  /** O tema efetivamente aplicado, já resolvido. */
  scheme: ThemeName;
  /** O que o usuário escolheu — pode ser 'system'. */
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

/**
 * Tema do app.
 *
 * Três opções e não duas: 'system' respeita o modo do aparelho, que é o que a
 * maioria espera hoje, mas escuro e claro explícitos existem porque neste
 * produto a escolha é situacional, não estética — sol na estrada pede claro,
 * barraca de madrugada pede escuro, e nenhum dos dois combina com o horário
 * que o SO usa para decidir sozinho.
 *
 * O padrão é ESCURO, não 'system': a maior parte do uso deste app acontece no
 * escuro, e um flash branco ao abrir de madrugada cega quem está com a vista
 * adaptada.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const doSistema = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('dark');

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if (v === 'dark' || v === 'light' || v === 'system') setPrefState(v);
      })
      .catch(() => {
        /* sem preferência salva: fica no padrão */
      });
  }, []);

  function setPref(p: ThemePref) {
    setPrefState(p);
    AsyncStorage.setItem(CHAVE, p).catch(() => {
      /* a escolha vale nesta sessão mesmo se o disco falhar */
    });
  }

  const scheme: ThemeName =
    pref === 'system' ? (doSistema === 'light' ? 'light' : 'dark') : pref;

  const valor = useMemo(
    () => ({ colors: PALETTES[scheme], scheme, pref, setPref }),
    [scheme, pref],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}

/** Atalho para quem só precisa das cores. */
export function useColors(): Palette {
  return useTheme().colors;
}
