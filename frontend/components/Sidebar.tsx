import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GroupSummary,
  loadValidatedGroups,
  createGroup as createRemoteGroup,
  deleteGroup as deleteRemoteGroup,
  appendGroupId,
  removeGroupId,
} from '@/lib/groupService';

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

function generateUuid(): string {
  // Prefer secure native implementation when available
  try {
    // @ts-ignore
    if (typeof globalThis?.crypto?.randomUUID === 'function') {
      // @ts-ignore
      return globalThis.crypto.randomUUID();
    }
  } catch (_) {
    // fall through
  }

  // Fallback simple UUID v4 generator (not cryptographically strong)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = React.useState<GroupSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<string[]>([]);

  // Load persisted groups from shared helper
  React.useEffect(() => {
    let mounted = true;

    async function hydrate() {
      setLoading(true);
      try {
        const { groups: storedGroups } = await loadValidatedGroups();
        if (mounted) {
          setGroups(storedGroups);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleDeleteGroup(id: string) {
    setDeletingIds((prev) => [...prev, id]);
    try {
      const success = await deleteRemoteGroup(id);
      if (!success) return;
      await removeGroupId(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } finally {
      setDeletingIds((prev) => prev.filter((x) => x !== id));
    }
  }

  async function handleCreateGroup() {
    setCreating(true);
    const id = generateUuid();

    try {
      const newGroup = await createRemoteGroup(id);
      if (!newGroup) return;
      await appendGroupId(id);
      setGroups((prev) => [newGroup, ...prev]);
    } finally {
      setCreating(false);
    }
  }

  const items = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Explore', href: '/explore', icon: '🔍' },
  ] as const;

  return (
    <View style={[styles.root, collapsed ? styles.rootCollapsed : null]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        {!collapsed && <Text style={styles.appTitle}>SplitSmart</Text>}
        {Platform.OS === 'web' && (
          <Pressable
            onPress={onToggle}
            accessibilityLabel={
              collapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>{collapsed ? '›' : '‹'}</Text>
          </Pressable>
        )}
      </View>

      {/* Navigation Items */}
      <View style={styles.navSection}>
        {items.map((i) => (
          <Link key={i.href} href={i.href} asChild>
            <Pressable style={styles.navItem}>
              <View style={styles.navIconContainer}>
                <Text style={styles.navIcon}>{i.icon}</Text>
              </View>
              {!collapsed && <Text style={styles.navLabel}>{i.label}</Text>}
            </Pressable>
          </Link>
        ))}
      </View>

      {/* Groups section */}
      <View style={styles.groupsSection}>
        {!collapsed && <Text style={styles.sectionTitle}>Gruppen</Text>}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#007AFF" />
          </View>
        ) : groups.length === 0 && !collapsed ? (
          <Text style={styles.emptyText}>Keine Gruppen</Text>
        ) : (
          groups.map((g) => (
            <Link
              key={g.id}
              href={`/group/${g.id}` as any}
              asChild
              style={styles.groupLinkWrapper}
            >
              <Pressable style={styles.groupLink}>
                <View style={styles.groupIconContainer}>
                  <Text style={styles.groupIcon}>👥</Text>
                </View>
                {!collapsed && (
                  <Text style={styles.groupName} numberOfLines={1}>
                    {g.name}
                  </Text>
                )}
              </Pressable>
            </Link>
          ))
        )}

        {/* Add group button styled like a group item */}
        <Pressable
          onPress={handleCreateGroup}
          accessibilityLabel="Create new group"
          style={[
            styles.addGroupButton,
            collapsed && styles.addGroupButtonCollapsed,
          ]}
          disabled={creating}
        >
          <View style={styles.groupIconContainer}>
            <Text style={styles.addGroupIcon}>{creating ? '⋯' : '+'}</Text>
          </View>
          {!collapsed && <Text style={styles.addGroupLabel}>Neue Gruppe</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  rootCollapsed: {
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  toggleButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  toggleText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '400',
  },

  // Navigation section
  navSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  navIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navIcon: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },

  // Groups section
  groupsSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Group items
  groupLinkWrapper: {
    marginBottom: 8,
  },
  groupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  groupIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupIcon: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  groupName: {
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
    flex: 1,
  },

  // Add group button (styled like group item)
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addGroupButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  addGroupIcon: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    color: '#007AFF',
    fontWeight: '300',
  },
  addGroupLabel: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '400',
  },
});
