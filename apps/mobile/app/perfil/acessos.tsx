import { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { spacing, type as typo, useColors } from '../../src/theme';
import { Tela, Cartao, Rotulo, Vazio, Aviso } from '../../src/components/Ui';

type Acesso = { id: number; ip: string | null; user_agent: string | null; accessed_at: string };

/**
 * Quem abriu o dossiê.
 *
 * Transparência aqui é funcionalidade, não cortesia: quem entrega o próprio
 * histórico médico a terceiros tem direito de saber quando alguém olhou.
 */
export default function Acessos() {
  const c = useColors();
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase
      .from('dossier_access_log')
      .select('id, ip, user_agent, accessed_at')
      .order('accessed_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setAcessos((data ?? []) as Acesso[]);
        setCarregando(false);
      });
  }, []);

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {carregando ? (
          <Vazio>Carregando…</Vazio>
        ) : acessos.length === 0 ? (
          <Vazio>
            Ninguém acessou seu dossiê. Ele só fica disponível durante um incidente aberto, por
            link com validade de 7 dias.
          </Vazio>
        ) : (
          <>
            <Rotulo>{`${acessos.length} acesso${acessos.length === 1 ? '' : 's'}`}</Rotulo>
            <Cartao>
              {acessos.map((a, i) => (
                <View
                  key={a.id}
                  style={{
                    padding: spacing.md,
                    borderBottomWidth: i === acessos.length - 1 ? 0 : 1,
                    borderBottomColor: c.border,
                  }}
                >
                  <Text style={{ ...typo.body, color: c.text }}>
                    {new Date(a.accessed_at).toLocaleString('pt-BR')}
                  </Text>
                  <Text style={{ ...typo.caption, color: c.textFaint, marginTop: 2 }}>
                    {a.ip ? `IP ${a.ip}` : 'IP não registrado'}
                    {a.user_agent ? ` · ${a.user_agent.slice(0, 60)}` : ''}
                  </Text>
                </View>
              ))}
            </Cartao>
          </>
        )}

        <View style={{ height: spacing.lg }} />
        <Aviso tom="info" titulo="Não reconhece um acesso?">
          Encerrar o incidente revoga todos os links imediatamente. Se algo parecer errado, fale
          com o suporte.
        </Aviso>
      </ScrollView>
    </Tela>
  );
}
