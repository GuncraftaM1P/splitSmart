import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';

import Sidebar from '@/components/Sidebar';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const showSidebar = width >= 768; // persistent Sidebar ab Tablet / Web

  const [collapsed, setCollapsed] = React.useState(false);
  const toggleCollapsed = () => setCollapsed((c) => !c);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {showSidebar && (
            <View
              style={[
                styles.sidebar,
                collapsed ? styles.sidebarCollapsed : null,
              ]}
            >
              <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
            </View>
          )}

          <View style={styles.content}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: 'modal', title: 'Modal' }}
              />
            </Stack>
          </View>
        </View>
      </SafeAreaView>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  sidebarCollapsed: {
    width: SIDEBAR_COLLAPSED_WIDTH,
  },
  content: { flex: 1 },
});
