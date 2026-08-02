import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { useColors, radius, type as typo } from '../../src/theme';

/**
 * Ícone de aba com pílula de destaque.
 *
 * O padrão do React Navigation só troca a cor do glifo, o que num emoji quase
 * não aparece — emoji tem cor própria e ignora `tintColor`. A pílula atrás
 * resolve: o estado ativo passa a ser lido pela forma, não pela cor do ícone.
 */
function Icone({ glifo, ativo, cor }: { glifo: string; ativo: boolean; cor: string }) {
  return (
    <View
      style={{
        width: 52,
        height: 32,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ativo ? cor : 'transparent',
      }}
    >
      <Text style={{ fontSize: 19, opacity: ativo ? 1 : 0.55 }}>{glifo}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const c = useColors();
  const pilula = `${c.brandLight}26`; // ~15% de opacidade

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarActiveTintColor: c.brandLight,
        tabBarInactiveTintColor: c.textFaint,
        tabBarLabelStyle: { ...typo.caption, fontSize: 11, marginTop: 2 },
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
          tabBarIcon: ({ focused }) => <Icone glifo="🛡" ativo={focused} cor={pilula} />,
        }}
      />
      <Tabs.Screen
        name="viagem"
        options={{
          title: 'Viagem',
          tabBarIcon: ({ focused }) => <Icone glifo="🧭" ativo={focused} cor={pilula} />,
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: 'Diário',
          headerShown: false,
          tabBarIcon: ({ focused }) => <Icone glifo="🗺" ativo={focused} cor={pilula} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <Icone glifo="👤" ativo={focused} cor={pilula} />,
        }}
      />
    </Tabs>
  );
}
