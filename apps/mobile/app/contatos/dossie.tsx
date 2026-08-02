import { useEffect, useState } from 'react';
import { ScrollView, View, TextInput, Alert, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { dossierInput } from '@sentinela/shared';
import { supabase } from '../../src/services/supabase';
import { spacing, radius, type as typo, useColors } from '../../src/theme';
import { Tela, Rotulo, Botao, Campo, Aviso, useInputStyle } from '../../src/components/Ui';

const TIPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function Dossie() {
  const router = useRouter();
  const c = useColors();
  const input = useInputStyle();

  const [tipo, setTipo] = useState<string>('');
  const [alergias, setAlergias] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [condicoes, setCondicoes] = useState('');
  const [passaporte, setPassaporte] = useState('');
  const [seguradora, setSeguradora] = useState('');
  const [apolice, setApolice] = useState('');
  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase
      .from('emergency_dossiers')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setTipo(data.blood_type ?? '');
        setAlergias(data.allergies ?? '');
        setMedicamentos(data.medications ?? '');
        setCondicoes(data.medical_conditions ?? '');
        setPassaporte(data.passport_masked ?? '');
        setSeguradora(data.insurance_provider ?? '');
        setApolice(data.insurance_policy ?? '');
        setNotas(data.additional_notes ?? '');
      });
  }, []);

  async function salvar() {
    const parsed = dossierInput.safeParse({
      blood_type: tipo || undefined,
      allergies: alergias.trim() || undefined,
      medications: medicamentos.trim() || undefined,
      medical_conditions: condicoes.trim() || undefined,
      passport_masked: passaporte.trim() || undefined,
      insurance_provider: seguradora.trim() || undefined,
      insurance_policy: apolice.trim() || undefined,
      additional_notes: notas.trim() || undefined,
    });

    if (!parsed.success) {
      Alert.alert('Dados inválidos', parsed.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }

    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSalvando(false);
      Alert.alert('Sessão expirada', 'Entre novamente.');
      return;
    }

    // upsert e não update: a linha só nasce quando o usuário preenche algo.
    // Um update num registro inexistente afetaria zero linhas e devolveria
    // sucesso — dado sensível parecendo salvo sem estar, e a descoberta seria
    // numa emergência.
    const { error } = await supabase.from('emergency_dossiers').upsert({
      user_id: user.id,
      blood_type: parsed.data.blood_type ?? null,
      allergies: parsed.data.allergies ?? null,
      medications: parsed.data.medications ?? null,
      medical_conditions: parsed.data.medical_conditions ?? null,
      passport_masked: parsed.data.passport_masked ?? null,
      insurance_provider: parsed.data.insurance_provider ?? null,
      insurance_policy: parsed.data.insurance_policy ?? null,
      additional_notes: parsed.data.additional_notes ?? null,
    });

    setSalvando(false);
    if (error) Alert.alert('Não foi possível salvar', error.message);
    else router.back();
  }

  return (
    <Tela>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Aviso tom="info" titulo="Só você vê isto">
          Nem gestor de organização, nem suporte, nem administrador da plataforma consegue ler
          este dossiê. Ele só sai por um link com validade, entregue ao seu contato de emergência
          quando um alerta dispara — e cada abertura fica registrada.
        </Aviso>

        <Rotulo>Tipo sanguíneo</Rotulo>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TIPOS.map((t) => {
            const ativo = t === tipo;
            return (
              <Pressable
                key={t}
                onPress={() => setTipo(ativo ? '' : t)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.sm,
                  borderWidth: 1.5,
                  borderColor: ativo ? c.brandLight : c.border,
                  backgroundColor: ativo ? c.surfaceAlt : c.surface,
                }}
              >
                <Text style={{ ...typo.body, color: ativo ? c.text : c.textMuted, fontWeight: '600' }}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: spacing.lg }} />

        <Campo label="Alergias">
          <TextInput
            style={[input, { height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' }]}
            multiline value={alergias} onChangeText={setAlergias} maxLength={500}
            placeholder="Penicilina, frutos do mar…" placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Campo label="Medicamentos em uso">
          <TextInput
            style={[input, { height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' }]}
            multiline value={medicamentos} onChangeText={setMedicamentos} maxLength={500}
            placeholder="Nome, dose e frequência" placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Campo label="Condições médicas">
          <TextInput
            style={[input, { height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' }]}
            multiline value={condicoes} onChangeText={setCondicoes} maxLength={1000}
            placeholder="Diabetes, epilepsia, marca-passo…" placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Campo label="Passaporte" hint="Só os 4 últimos dígitos — nunca o número inteiro">
          <TextInput
            style={input} value={passaporte} onChangeText={setPassaporte} maxLength={8}
            placeholder="••••1234" placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Campo label="Seguro viagem">
          <TextInput
            style={input} value={seguradora} onChangeText={setSeguradora} maxLength={120}
            placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Campo label="Número da apólice">
          <TextInput
            style={input} value={apolice} onChangeText={setApolice} maxLength={80}
            placeholderTextColor={c.textFaint}
          />
        </Campo>

        <Campo label="Observações" hint="Idiomas que fala, contato do seu médico…">
          <TextInput
            style={[input, { height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' }]}
            multiline value={notas} onChangeText={setNotas} maxLength={1000}
            placeholderTextColor={c.textFaint}
          />
        </Campo>

        <View style={{ height: spacing.md }} />
        <Botao label="Salvar dossiê" onPress={salvar} ocupado={salvando} />
      </ScrollView>
    </Tela>
  );
}
