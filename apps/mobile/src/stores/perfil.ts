import { create } from 'zustand';
import { supabase } from '../services/supabase';

export type Perfil = {
  full_name: string;
  home_country: string | null;
  current_country: string | null;
  avatar_url: string | null;
  /**
   * Vem de `auth.users`, não de `profiles`.
   *
   * A tabela de perfil não guarda e-mail — ele mora no schema de autenticação,
   * e duplicá-lo criaria duas versões da mesma verdade. Como já chamamos
   * `getUser()` aqui para descobrir o id, o e-mail sai de graça na mesma ida.
   */
  email: string | null;
};

type PerfilStore = {
  perfil: Perfil | null;
  carregando: boolean;
  carregar: () => Promise<void>;
  limpar: () => void;
};

/**
 * Perfil do usuário logado.
 *
 * Store própria e não parte de `useSessionStore` porque as duas coisas mudam
 * em ritmos diferentes: a sessão de viagem é recarregada a cada sinal de vida,
 * o nome da pessoa não muda quase nunca. Juntar faria a identidade do
 * cabeçalho piscar a cada check-in.
 *
 * `current_country` é atualizado pelo reverse-geocode a cada troca de país, e
 * é ele que faz a bandeira do cabeçalho acompanhar a viagem.
 */
export const usePerfilStore = create<PerfilStore>((set) => ({
  perfil: null,
  carregando: true,

  async carregar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ perfil: null, carregando: false });
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, home_country, current_country, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    set({
      perfil: data ? { ...(data as Omit<Perfil, 'email'>), email: user.email ?? null } : null,
      carregando: false,
    });
  },

  limpar: () => set({ perfil: null, carregando: false }),
}));

/**
 * Primeiro nome, apresentável.
 *
 * Quando o cadastro não traz nome, o gatilho `tg_handle_new_user` usa o que
 * vem antes do @ do e-mail. Isso produz coisas como "jeanluiz38" — que em
 * caixa baixa, ao lado de uma saudação, parece defeito. A capitalização não
 * conserta o apelido, mas faz ele passar por nome.
 */
export function primeiroNome(perfil: Perfil | null): string {
  const bruto = (perfil?.full_name ?? '').trim().split(/\s+/)[0] ?? '';
  if (!bruto) return '';
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}
