import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme';

function Icon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.brandLight,
        tabBarInactiveTintColor: colors.textFaint,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Segurança',
          headerShown: false,
          tabBarIcon: ({ color }) => <Icon glyph="🛡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="viagem"
        options={{
          title: 'Viagem',
          tabBarIcon: ({ color }) => <Icon glyph="🧭" color={color} />,
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: 'Diário',
          headerShown: false,
          tabBarIcon: ({ color }) => <Icon glyph="🗺" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Icon glyph="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
