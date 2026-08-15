import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Icone, type NomeIcone } from '../../src/components/Icone';
import { useColors, radius, type as typo } from '../../src/theme';

/**
 * Ícone de aba.
 *
 * A pílula de destaque atrás do glifo saiu junto com os emojis. Ela existia
 * porque emoji tem cor própria e ignora `tintColor` — o estado ativo precisava
 * ser dito pela forma, já que a cor não obedecia. Com ícone de traço a cor
 * volta a funcionar, e um traço a mais de espessura no ativo dá o peso que a
 * pílula dava sem encher a barra de fundos coloridos.
 *
 * O risco embaixo marca a aba atual. É o mesmo recurso da barra de estatísticas
 * da referência, e sobrevive ao daltonismo: quem não distingue o tom ainda vê
 * onde está.
 */
function IconeAba({ nome, ativo, cor }: { nome: NomeIcone; ativo: boolean; cor: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Icone nome={nome} cor={cor} tamanho={21} traco={ativo ? 2.1 : 1.7} />
      <View
        style={{
          width: 16,
          height: 2,
          borderRadius: radius.pill,
          backgroundColor: ativo ? cor : 'transparent',
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          // Mesmo preto do conteúdo, não a superfície cinza: barra em outro tom
          // desenha uma faixa horizontal no pé da tela, e o olho a lê como
          // conteúdo. A linha fina de 1px já separa o que precisa ser separado.
          backgroundColor: c.bg,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.textFaint,
        tabBarLabelStyle: { ...typo.caption, fontSize: 10, fontWeight: '700', marginTop: 2 },
        headerStyle: { backgroundColor: c.bg, shadowColor: 'transparent' },
        headerTitleStyle: { ...typo.h2, color: c.text },
        headerTintColor: c.text,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Segurança',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <IconeAba nome="escudo" ativo={focused} cor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="viagem"
        options={{
          title: 'Viagem',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <IconeAba nome="bussola" ativo={focused} cor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: 'Diário',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <IconeAba nome="mapa" ativo={focused} cor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <IconeAba nome="pessoa" ativo={focused} cor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
