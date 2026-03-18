import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppProvider, useAppContext } from '@/components/AppContext';

export const unstable_settings = {
  anchor: '(tabs)',
};



function RootLayoutContent() {
  const { darkTheme, userRole, isStorageLoading } = useAppContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isStorageLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (!userRole && inTabsGroup) {
      router.replace('/welcome');
    } else if (userRole && (segments[0] === 'welcome' || !segments[0])) {
      router.replace('/(tabs)');
    }
  }, [userRole, segments, isStorageLoading]);

  if (isStorageLoading) {
    // Return nothing or a small loader while we determine the session
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={darkTheme ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutContent />
    </AppProvider>
  );
}

