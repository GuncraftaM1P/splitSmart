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
  View,
  StyleSheet,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Sidebar from '@/components/Sidebar';
import Drawer from '@/components/Drawer';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Create a context to share drawer state with child components
export const DrawerContext = React.createContext({
  toggleDrawer: () => {},
  isDrawerOpen: false,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const showPersistentSidebar = width >= 768; // persistent Sidebar ab Tablet / Web
  // drawer width should match Drawer component (3/4 of screen)
  const drawerWidth = Math.round(width * 0.75);

  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const contentAnim = React.useRef(new Animated.Value(0)).current;

  const toggleCollapsed = () => setCollapsed((c) => !c);
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

  // Animate main content when drawer opens on mobile
  React.useEffect(() => {
    if (showPersistentSidebar) {
      // no animation when sidebar is persistent
      contentAnim.setValue(0);
      return;
    }

    Animated.timing(contentAnim, {
      toValue: drawerOpen ? drawerWidth : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerWidth, showPersistentSidebar, contentAnim]);

  return (
    <DrawerContext.Provider value={{ toggleDrawer, isDrawerOpen: drawerOpen }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.container}>
            {showPersistentSidebar && (
              <View
                style={[
                  styles.sidebar,
                  collapsed ? styles.sidebarCollapsed : null,
                ]}
              >
                <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
              </View>
            )}

            <Animated.View
              style={[
                styles.content,
                { transform: [{ translateX: contentAnim }] },
              ]}
            >
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="group/[uuid]" options={{ headerShown: false }} />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: 'modal', title: 'Modal' }}
                />
              </Stack>
            </Animated.View>

            {/* Mobile drawer */}
            {!showPersistentSidebar && (
              <Drawer visible={drawerOpen} onClose={closeDrawer}>
                <Sidebar collapsed={false} onToggle={closeDrawer} />
              </Drawer>
            )}
          </View>
        </SafeAreaView>

        <StatusBar style="auto" />
      </ThemeProvider>
    </DrawerContext.Provider>
  );
}

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 64;

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f5' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  sidebarCollapsed: {
    width: SIDEBAR_COLLAPSED_WIDTH,
  },
  content: { flex: 1, backgroundColor: '#fff' },
});
