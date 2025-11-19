import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Explore', href: '/explore' },
  ] as const;

  return (
    <View style={[styles.root, collapsed ? styles.rootCollapsed : null]}>
      <View style={styles.header}>
        {!collapsed && <Text style={styles.title}>Menu</Text>}
        <Pressable
          onPress={onToggle}
          accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>{collapsed ? '»' : '«'}</Text>
        </Pressable>
      </View>

      <View style={styles.items}>
        {items.map(i => (
          <Link key={i.href} href={i.href} asChild>
            <Pressable style={styles.item}>
              <Text style={[styles.itemText, collapsed ? styles.itemTextCollapsed : null]}>
                {collapsed ? i.label.charAt(0) : i.label}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 12, backgroundColor: '#fff', height: '100%' },
  rootCollapsed: { paddingHorizontal: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontWeight: '700', fontSize: 16 },
  toggleButton: {
    padding: 6,
    borderRadius: 6,
  },
  toggleText: { fontSize: 16 },
  items: { marginTop: 4 },
  item: { paddingVertical: 10, alignItems: 'center' },
  itemText: { fontSize: 16 },
  itemTextCollapsed: { fontSize: 14 },
});