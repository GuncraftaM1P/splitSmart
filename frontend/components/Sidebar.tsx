import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import appConfig from '../app.json';
import {
  GroupSummary,
  loadValidatedGroups,
  createGroup as createRemoteGroup,
  appendGroupId,
  fetchGroupSummaryWithRetry,
  onGroupsChanged,
} from '@/lib/groupService';
import { getBackendURL } from '@/constants/api';

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
  ignoreSafeArea?: boolean;
};

export default function Sidebar({
  collapsed = false,
  onToggle,
  ignoreSafeArea = false,
}: SidebarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [groups, setGroups] = React.useState<GroupSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<string[]>([]);
  const safeTop = ignoreSafeArea ? 0 : Math.max(insets.top, 20);
  const version =
    (appConfig as any)?.expo?.version ?? (appConfig as any)?.version ?? '?.?.?';
  const [joinId, setJoinId] = React.useState('');
  const [joining, setJoining] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [showBackendText, setShowBackendText] = React.useState(false);
  const backendUrl = getBackendURL();
  const isWeb = Platform.OS === 'web';

  // Auto-scaling text for the join button: native uses built-in props,
  // web measures text width with a canvas and adjusts fontSize to fit.
  function AutoFitText({ children, style }: { children: string; style?: any }) {
    if (!isWeb) {
      return (
        <Text
          style={style}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {children}
        </Text>
      );
    }

    const [containerWidth, setContainerWidth] = React.useState(0);
    const [fontSize, setFontSize] = React.useState<number | undefined>(
      undefined,
    );

    const baseFontSize =
      (StyleSheet.flatten(style || {})?.fontSize as number) || 14;

    React.useEffect(() => {
      if (!containerWidth) return;

      // measure text using canvas
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const fontFamily =
          (StyleSheet.flatten(style || {})?.fontFamily as string) ||
          'system-ui, sans-serif';
        ctx.font = `${baseFontSize}px ${fontFamily}`;
        const text = String(children);
        const metrics = ctx.measureText(text || '');
        const textWidth = metrics.width || 0;
        if (!textWidth) return;
        // target width is containerWidth minus some padding
        const target = Math.max(8, containerWidth - 8);
        const scale = Math.min(1, target / textWidth);
        const newSize = Math.max(10, Math.floor(baseFontSize * scale));
        setFontSize(newSize);
      } catch (err) {
        // ignore and keep default
      }
    }, [containerWidth, children, baseFontSize, style]);

    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Text
          style={[style, { fontSize: fontSize ?? baseFontSize }]}
          numberOfLines={1}
        >
          {children}
        </Text>
      </View>
    );
  }

  const toggleBackendText = () => {
    setShowBackendText((v) => !v);
  };

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
    const id = uuid.v4() as string;

    try {
      const newGroup = await createRemoteGroup(id);
      if (!newGroup) return;
      await appendGroupId(id);
      setGroups((prev) => [newGroup, ...prev]);
      // navigate to the new group as the active route (replace history)
      router.replace(`/group/${id}`);
    } finally {
      setCreating(false);
    }
  }

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

        <View style={styles.collapsedGroupsSection}>
          {loading ? (
            <ActivityIndicator color="#007AFF" size="small" />
          ) : groups.length === 0 ? (
            <Text style={styles.collapsedEmpty}>—</Text>
          ) : (
            groups.map((g) => (
              <Pressable
                key={g.id}
                style={styles.collapsedIconButton}
                accessibilityLabel={g.name}
                disabled={deletingIds.includes(g.id)}
                onPress={() => {
                  if (pathname === `/group/${g.id}`) return;
                  router.replace(`/group/${g.id}`);
                }}
              >
                <Text style={styles.collapsedEmoji}>👥</Text>
              </Pressable>
            ))
          )}
        </View>
        <View style={styles.footerCollapsed}>
          <Pressable
            onPress={toggleBackendText}
            accessibilityLabel="Toggle backend url"
          >
            <Text style={styles.versionText}>
              {showBackendText ? String(backendUrl) : `v${version}`}
            </Text>
          </Pressable>
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
            <Pressable
              key={g.id}
              style={[styles.groupLinkWrapper, styles.groupLink]}
              onPress={() => {
                if (pathname === `/group/${g.id}`) return;
                router.replace(`/group/${g.id}`);
              }}
            >
              <View style={styles.groupIconContainer}>
                <Text style={styles.groupIcon}>👥</Text>
              </View>
              <Text style={styles.groupName} numberOfLines={1}>
                {g.name}
              </Text>
            </Pressable>
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
        {/* Join group by UUID */}
        <View style={styles.joinContainer}>
          <TextInput
            value={joinId}
            onChangeText={(t) => {
              setJoinId(t);
              if (joinError) setJoinError(null);
            }}
            placeholder="Gruppen-ID..."
            style={[styles.joinInput, isWeb && styles.joinInputWeb]}
            editable={!joining}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={Platform.OS === 'web' ? 'default' : 'default'}
          />
          <Pressable
            onPress={async () => {
              const id = joinId.trim();
              if (!id) {
                setJoinError('Bitte eine gültige UUID eingeben.');
                return;
              }
              setJoining(true);
              setJoinError(null);
              try {
                const summary = await fetchGroupSummaryWithRetry(id);
                if (summary === null) {
                  setJoinError('Gruppe nicht gefunden. Bitte prüfen.');
                } else if (summary === undefined) {
                  setJoinError('Fehler beim Prüfen der Gruppe.');
                } else {
                  await appendGroupId(id);
                  setGroups((prev) => [
                    summary,
                    ...prev.filter((g) => g.id !== id),
                  ]);
                  setJoinId('');
                  router.replace(`/group/${id}`);
                }
              } catch (err) {
                console.warn('Join group error', err);
                setJoinError('Fehler beim Beitreten zur Gruppe.');
              } finally {
                setJoining(false);
              }
            }}
            style={[styles.joinButton, isWeb && styles.joinButtonWeb]}
            disabled={joining}
          >
            <AutoFitText
              style={[styles.joinButtonText, isWeb && styles.joinButtonTextWeb]}
            >
              {joining ? '...' : 'Beitreten'}
            </AutoFitText>
          </Pressable>
        </View>
        {joinError ? (
          <Text style={styles.joinErrorText}>{joinError}</Text>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Pressable
          onPress={toggleBackendText}
          accessibilityLabel="Toggle backend url"
        >
          <Text style={styles.versionText}>
            {showBackendText ? String(backendUrl) : `v${version}`}
          </Text>
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
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#f7f8fa',
  },
  footerCollapsed: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    width: '100%',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  joinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  joinInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  // Web-specific sizes: input 75%, button 25%
  joinInputWeb: {
    flex: undefined,
    width: '75%',
    marginRight: 8,
  },
  joinButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  joinButtonWeb: {
    flex: undefined,
    width: '25%',
    height: 40,
    paddingHorizontal: 0,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  joinButtonTextWeb: {
    fontSize: 14,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 18,
  },
  joinErrorText: {
    color: '#cc0033',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
});
