import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { getColors } from '@/constants/theme';
import { useAppContext } from '@/components/AppContext';

export default function TabLayout() {
  const { darkTheme, userRole } = useAppContext();
  const theme = getColors(darkTheme);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.glassBorder,
          height: Platform.OS === 'ios' ? 90 : 72,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        }
      }}>
      <Tabs.Screen
        name="system"
        options={{
          title: userRole === 'agent' ? 'Agent' : 'Seller',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="stats-chart" color={color} />,
          href: (userRole === 'agent' || userRole === 'admin') ? '/system' : null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="wallet-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="topup"
        options={{
          title: 'Refill',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="add-circle-outline" color={color} />,
          href: (userRole === 'agent' || userRole === 'admin') ? '/topup' : null,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="cart-outline" color={color} />,
          href: (userRole === 'sales' || userRole === 'admin') ? '/marketplace' : null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="time-outline" color={color} />,
          href: (userRole === 'agent' || userRole === 'sales' || userRole === 'admin') ? '/history' : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}

