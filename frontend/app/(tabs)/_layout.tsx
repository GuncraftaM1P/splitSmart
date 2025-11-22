import { Tabs } from 'expo-router';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import HamburgerButton from '@/components/HamburgerButton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DrawerContext } from '../_layout';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { toggleDrawer } = React.useContext(DrawerContext);

  const showHamburger = width < 768;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: showHamburger,
        tabBarButton: HapticTab,
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e9ecef',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
        headerLeft: showHamburger
          ? () => (
              <HamburgerButton
                onPress={toggleDrawer}
                color={Colors[colorScheme ?? 'light'].text}
              />
            )
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
