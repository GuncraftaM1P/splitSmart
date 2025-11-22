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

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

type Group = { id: string; name: string };

const STORAGE_KEY = 'splitSmart.groups';

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
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<string[]>([]);
  async function deleteGroup(id: string) {
    setDeletingIds((prev) => [...prev, id]);
    try {
      const backendURL =
        typeof window !== 'undefined'
          ? window.location.origin.replace(':8081', ':8787') + '/api/'
          : '/api/';
      const res = await fetch(backendURL + `groups/${id}/delete`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn('Failed to delete group', text);
        return;
      }
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.warn('Error deleting group', err);
    } finally {
      setDeletingIds((prev) => prev.filter((x) => x !== id));
    }
  }

  // Load persisted groups (if any) from localStorage (web) or memory
  React.useEffect(() => {
    let mounted = true;

    async function validatePersisted() {
      setLoading(true);
      try {
        const raw =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem(STORAGE_KEY)
            : null;
        if (!raw) return;

        const parsed = JSON.parse(raw) as Group[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          if (mounted) setGroups([]);
          return;
        }

        const backendURL =
          typeof window !== 'undefined'
            ? window.location.origin.replace(':8081', ':8787') + '/api/'
            : '/api/';

        const checks = await Promise.all(
          parsed.map(async (g) => {
            try {
              const res = await fetch(backendURL + `groups/${g.id}/info`);
              if (res.ok) {
                const json = await res.json();
                return { id: g.id, name: json.name } as Group;
              }

              // If 404 -> group doesn't exist on server -> drop it
              if (res.status === 404) return null;

              // Other non-ok (500 etc.) -> keep local entry to avoid accidental loss
              console.warn(
                `Unexpected status while validating group ${g.id}: ${res.status}`,
              );
              return g;
            } catch (err) {
              // Network or other error -> keep local entry so UI remains usable
              console.warn('Network error while validating group', g.id, err);
              return g;
            }
          }),
        );

        const validated = checks.filter(Boolean) as Group[];
        if (mounted) setGroups(validated);
      } catch (err) {
        console.warn('Failed to validate persisted groups', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    validatePersisted();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    // Persist groups when changed
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
      }
    } catch (err) {
      // ignore
    }
  }, [groups]);

  async function refreshGroupInfo(id: string) {
    try {
      const backendURL =
        typeof window !== 'undefined'
          ? window.location.origin.replace(':8081', ':8787') + '/api/'
          : '/api/';

      const res = await fetch(backendURL + `groups/${id}/info`);
      if (!res.ok) return null;
      const json = await res.json();
      return { id, name: json.name } as Group;
    } catch (err) {
      return null;
    }
  }

  async function createGroup() {
    setCreating(true);
    const id = generateUuid();

    try {
      const backendURL =
        typeof window !== 'undefined'
          ? window.location.origin.replace(':8081', ':8787') + '/api/'
          : '/api/';

      const res = await fetch(backendURL + `groups/${id}/create`, {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn('Failed to create group', text);
        setCreating(false);
        return;
      }

      // after creation, fetch the group's info
      const info = await refreshGroupInfo(id);
      const newGroup = info ?? { id, name: `Group ${id.slice(0, 6)}` };
      setGroups((prev) => [newGroup, ...prev]);
    } catch (err) {
      console.warn('Error creating group', err);
    } finally {
      setCreating(false);
    }
  }

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
        {items.map((i) => (
          <Link key={i.href} href={i.href} asChild>
            <Pressable style={styles.groupLink}>
              <Text style={styles.groupName}>
                {collapsed ? i.label.charAt(0) : i.label}
              </Text>
            </Pressable>
          </Link>
        ))}

        {/* Groups section */}
        <View style={{ marginTop: 12 }}>
          {!collapsed && <Text style={[styles.sectionTitle]}>Gruppen</Text>}

          {loading ? (
            <ActivityIndicator />
          ) : (
            groups.map((g) => (
              <View key={g.id} style={styles.itemRow}>
                {Platform.OS === 'web' ? (
                  <a href={`/groups/${g.id}`} style={styles.groupLink}>
                    {!collapsed && (
                      <span
                        style={styles.groupIcon}
                        role="img"
                        aria-label="Gruppe"
                      >
                        👥
                      </span>
                    )}
                    <span style={styles.groupName}>
                      {collapsed ? g.name.charAt(0) : g.name}
                    </span>
                  </a>
                ) : (
                  <Link href={`/groups/${g.id}` as unknown as any} asChild>
                    <Pressable
                      style={[
                        styles.groupLink,
                        collapsed ? styles.groupLinkCollapsed : null,
                      ]}
                    >
                      {!collapsed && <Text style={styles.groupIcon}>👥</Text>}
                      <Text
                        style={[
                          styles.groupName,
                          collapsed ? styles.groupNameCollapsed : null,
                        ]}
                      >
                        {collapsed ? g.name.charAt(0) : g.name}
                      </Text>
                    </Pressable>
                  </Link>
                )}
                {!collapsed &&
                  (Platform.OS === 'web' ? (
                    <button
                      onClick={() => deleteGroup(g.id)}
                      aria-label={`Gruppe ${g.name} löschen`}
                      style={styles.deleteButton}
                      disabled={deletingIds.includes(g.id)}
                    >
                      <span style={styles.deleteButtonText}>
                        {deletingIds.includes(g.id) ? '…' : '✕'}
                      </span>
                    </button>
                  ) : (
                    <Pressable
                      onPress={() => deleteGroup(g.id)}
                      accessibilityLabel={`Gruppe ${g.name} löschen`}
                      style={styles.deleteButton}
                      disabled={deletingIds.includes(g.id)}
                    >
                      <Text style={styles.deleteButtonText}>
                        {deletingIds.includes(g.id) ? '…' : '✕'}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            ))
          )}

          <View style={{ marginTop: 8 }}>
            <Pressable
              onPress={createGroup}
              accessibilityLabel="Create new group"
              style={[
                styles.createButton,
                creating ? styles.createButtonDisabled : null,
              ]}
              disabled={creating}
            >
              <Text style={styles.createButtonText}>
                {creating
                  ? 'Erstelle …'
                  : collapsed
                    ? '+'
                    : 'Neue Gruppe erstellen'}
              </Text>
            </Pressable>
          </View>
        </View>
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupLink: {
    flex: 1,
    textDecorationLine: 'none',
    backgroundColor: 'linear-gradient(90deg, #e0e7ff 0%, #f0fdfa 100%)', // web only
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginVertical: 5,
    marginRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    // web only
    cursor: 'pointer',
  },
  groupIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#6366f1',
    alignSelf: 'center',
  },
  groupLinkCollapsed: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    letterSpacing: 0.2,
    alignSelf: 'center',
    fontFamily:
      Platform.OS === 'web'
        ? 'Inter, Montserrat, system-ui, Arial, sans-serif'
        : undefined,
  },
  groupNameCollapsed: {
    fontSize: 15,
    fontWeight: '700',
  },
  createButtonText: { fontSize: 14, color: '#fff' },
  createButtonDisabled: { opacity: 0.6 },
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
  },
  sectionTitle: { fontWeight: '600', marginBottom: 6 },
  deleteButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteButtonText: { color: '#888', fontSize: 14 },
});
