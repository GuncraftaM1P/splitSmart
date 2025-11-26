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
  appendGroupId,
  onGroupsChanged,
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
  const safeTop = Math.max(insets.top, 20);

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

    const unsubscribe = onGroupsChanged(() => {
      (async () => {
        try {
          const { groups: storedGroups } = await loadValidatedGroups();
          if (!mounted) return;
          setGroups(storedGroups);
        } catch (err) {
          console.warn('Error refreshing groups from subscription', err);
        }
      })();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

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

  if (collapsed) {
    return (
      <View style={[styles.root, styles.rootCollapsed]}>
        <View style={[styles.collapsedHeader, { paddingTop: safeTop }]}>
          {Platform.OS === 'web' && (
            <Pressable
              onPress={onToggle}
              accessibilityLabel="Expand sidebar"
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>›</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.collapsedNavSection}>
          {items.map((i) => (
            <Link key={i.href} href={i.href} asChild>
              <Pressable
                style={styles.collapsedIconButton}
                accessibilityLabel={i.label}
              >
                <Text style={styles.collapsedEmoji}>{i.icon}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        <View style={styles.collapsedDivider} />

        <View style={styles.collapsedGroupsSection}>
          {loading ? (
            <ActivityIndicator color="#007AFF" size="small" />
          ) : groups.length === 0 ? (
            <Text style={styles.collapsedEmpty}>—</Text>
          ) : (
            groups.map((g) => (
              <Link key={g.id} href={`/group/${g.id}` as any} asChild>
                <Pressable
                  style={styles.collapsedIconButton}
                  accessibilityLabel={g.name}
                  disabled={deletingIds.includes(g.id)}
                >
                  <Text style={styles.collapsedEmoji}>👥</Text>
                </Pressable>
              </Link>
            ))
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeTop }]}>
        <Text style={styles.appTitle}>SplitSmart</Text>
        {Platform.OS === 'web' && (
          <Pressable
            onPress={onToggle}
            accessibilityLabel="Collapse sidebar"
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>‹</Text>
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
              <Text style={styles.navLabel}>{i.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      {/* Groups section */}
      <View style={styles.groupsSection}>
        <Text style={styles.sectionTitle}>Gruppen</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#007AFF" />
          </View>
        ) : groups.length === 0 ? (
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
                <Text style={styles.groupName} numberOfLines={1}>
                  {g.name}
                </Text>
              </Pressable>
            </Link>
          ))
        )}

        {/* Add group button styled like a group item */}
        <Pressable
          onPress={handleCreateGroup}
          accessibilityLabel="Create new group"
          style={styles.addGroupButton}
          disabled={creating}
        >
          <View style={styles.groupIconContainer}>
            <Text style={styles.addGroupIcon}>{creating ? '⋯' : '+'}</Text>
          </View>
          <Text style={styles.addGroupLabel}>Neue Gruppe</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  rootCollapsed: {
    paddingHorizontal: 8,
    alignItems: 'stretch',
  },
  collapsedHeader: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    padding: 0,
  },
  toggleText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '400',
    lineHeight: 36,
    textAlign: 'center',
  },

  // Navigation section
  navSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  collapsedNavSection: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: '#fff',
  },
  collapsedIconButton: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  collapsedEmoji: {
    fontSize: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  collapsedDivider: {
    width: 28,
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 8,
    alignSelf: 'center',
  },
  collapsedGroupsSection: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  collapsedEmpty: {
    color: '#bbb',
    fontSize: 16,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
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
