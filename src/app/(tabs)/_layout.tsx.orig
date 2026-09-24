import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { getSecureSmsColors } from '@/constants/secure-sms-theme';

export default function SmsTabsLayout() {
  const palette = getSecureSmsColors(useColorScheme());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: palette.nav,
          borderTopColor: palette.border,
          height: 64,
          paddingTop: 7,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Messages',
          tabBarAccessibilityLabel: 'Conversations',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarAccessibilityLabel: 'Réglages',
        }}
      />
    </Tabs>
  );
}
