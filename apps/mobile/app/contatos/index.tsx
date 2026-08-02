import { useCallback, useState } from 'react';
import { ScrollView, View, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { spacing, useColors } from '../../src/theme';
import { Tela, Cartao, Linha, Rotulo, Botao, Vazio, Aviso } from '../../src/components/Ui';

type Contato = {
  id: string;
  full_name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  preferred_channel: string;
  priority: number;
  is_verified: boolean;
};

const CANAL: Record<string, string> = {
  email: 'E-mail',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  push: 'Push',
};

export default function ContatosLista() {
  const router = useRouter();
  const c = useColors();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id, full_name, relationship, email, phone, preferred_channel, priority, is_verified')
      .order('priority', { ascending: true });

    if (error) Alert.alert('Não foi possível carregar', error.message);
    setContatos((data ?? []) as Contato[]);
    setCarregando(false);
  }, []);

  // useFocusEffect e não useEffect: voltar da tela de "novo contato" precisa
  // refletir o que acabou de ser criado. Com useEffect a lista ficaria velha.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function remover(id: string, nome: string) {
    Alert.alert('Remover contato', `${nome} deixa de ser avisado em uma emergência.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
          if (error) Alert.alert('Falhou', error.message);
          else carregar();
        },
      },
    ]);
  }

  return (
    <Tela>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={c.brandLight} />
        }
      >
        {contatos.length === 0 && !carregando ? (
          <Aviso tom="atencao" titulo="Nenhum contato cadastrado">
            Sem contato, o alarme dispara e não há para quem avisar. O Dossiê de Emergência fica
            sem destinatário.
          </Aviso>
        ) : (
          <>
            <Rotulo>Ordem de acionamento</Rotulo>
            <Cartao>
              {contatos.map((ct, i) => (
                <Linha
                  key={ct.id}
                  label={`${ct.priority}. ${ct.full_name}`}
                  valor={CANAL[ct.preferred_channel] ?? ct.preferred_channel}
                  onPress={() => remover(ct.id, ct.full_name)}
                  ultima={i === contatos.length - 1}
                />
              ))}
            </Cartao>
            <View style={{ height: spacing.sm }} />
            <Vazio>Toque num contato para removê-lo.</Vazio>
          </>
        )}

        <View style={{ height: spacing.lg }} />
        <Botao label="Adicionar contato" onPress={() => router.push('/contatos/novo')} />

        <View style={{ height: spacing.lg }} />
        <Aviso tom="info" titulo="Avise essas pessoas">
          Elas só são acionadas se você ficar sem dar sinal de vida além do combinado. Quem não
          sabe que é contato de emergência costuma ignorar a notificação achando que é golpe.
        </Aviso>
      </ScrollView>
    </Tela>
  );
}
