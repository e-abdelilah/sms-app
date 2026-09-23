import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { SecureSmsSplashOverlay } from '@/components/secure-sms-splash';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { MockSmsProvider } from '@/context/mock-sms-context';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isAuthenticated, recordUserActivity } = useAuth();

  return (
    <View onTouchStart={recordUserActivity} style={styles.navigationRoot}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="lock" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[conversationId]" />
          <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <MockSmsProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
          <SecureSmsSplashOverlay />
        </MockSmsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  navigationRoot: {
    flex: 1,
  },
});
