import {
  StyleSheet,
  Pressable,
  TextInput,
  View,
  Text,
  useWindowDimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useState, useRef, useContext, useCallback, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';

import { getBackendURL } from '@/constants/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import HamburgerButton from '@/components/HamburgerButton';
import { DrawerContext } from '../_layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  fetchGroupDetails,
  GroupDetails,
  deleteGroup as deleteRemoteGroup,
  removeGroupId,
} from '@/lib/groupService';
import { loadStoredGroupIds } from '@/lib/groupService';

export default function GroupScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const [data, setData] = useState<GroupDetails | null>(null);
  const [error, setError] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [groupMissing, setGroupMissing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const isMountedRef = useRef(true);
  const [titleWidth, setTitleWidth] = useState(0);
  const [descriptionWidth, setDescriptionWidth] = useState(0);

  const { width } = useWindowDimensions();
  const { toggleDrawer } = useContext(DrawerContext);
  const colorScheme = useColorScheme();
  const showHamburger = width < 768;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // PanResponder to detect left->right swipe from left edge to open sidebar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e, gs) => {
        // start only when touching near left edge on mobile and not editing
        return (
          showHamburger &&
          !isEditingName &&
          !isEditingDescription &&
          (gs.x0 ?? 0) < 30
        );
      },
      onMoveShouldSetPanResponder: (e, gs) => {
        // start when horizontal movement dominates and to the right
        return (
          showHamburger &&
          !isEditingName &&
          !isEditingDescription &&
          Math.abs(gs.dx) > 6 &&
          Math.abs(gs.dx) > Math.abs(gs.dy) &&
          gs.dx > 6 &&
          (gs.x0 ?? 0) < 30
        );
      },
      onPanResponderRelease: (e, gs) => {
        // if swipe sufficiently right, open drawer
        if (gs.dx > 60) {
          try {
            toggleDrawer();
          } catch (err) {
            // ignore
          }
        }
      },
    }),
  ).current;

  const backendURL = getBackendURL();

  useEffect(() => {
    setGroupMissing(false);
    setError('');
    setData(null);
  }, [uuid]);

  const fetchGroupInfo = async () => {
    if (!uuid || !isMountedRef.current || groupMissing) return;

    try {
      const json = await fetchGroupDetails(uuid);

      if (!isMountedRef.current) return;

      setData(json);

      if (!isEditingName) {
        setEditedName(json.name);
        setOriginalName(json.name);
      }
      if (!isEditingDescription) {
        setEditedDescription(json.description);
        setOriginalDescription(json.description);
      }
      setError('');
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const status = err?.status;
      if (status === 404) {
        setGroupMissing(true);
        setError('Group not found');
        setData(null);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return;
      }

      setError('Error loading group');
      console.error('Error fetching data:', err);
    }
  };

  // Initial fetch and polling every 5 seconds while screen is focused
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!uuid || groupMissing) return;

      isMountedRef.current = true;
      fetchGroupInfo();

      pollRef.current = setInterval(() => {
        fetchGroupInfo();
      }, 5000);

      return () => {
        isMountedRef.current = false;
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }, [uuid, groupMissing]),
  );

  const sendPatchUpdate = async (updates: {
    name?: string;
    description?: string;
  }) => {
    if (!uuid) {
      return false;
    }
    try {
      const res = await fetch(`${backendURL}groups/${uuid}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Update failed');
        return false;
      }
      setError('');
      return true;
    } catch {
      setError('Update failed');
      return false;
    }
  };

  const handleEditNameClick = async () => {
    if (isEditingName) {
      const trimmedName = editedName.trim();
      if (trimmedName.length === 0) {
        setError('Group name cannot be empty');
        return;
      }
      if (trimmedName !== originalName) {
        const success = await sendPatchUpdate({ name: trimmedName });
        if (!success) {
          return;
        }
        setOriginalName(trimmedName);
        setData((old) => (old ? { ...old, name: trimmedName } : old));
      }
    }
    setIsEditingName(!isEditingName);
  };

  const handleEditDescriptionClick = async () => {
    if (isEditingDescription) {
      if (editedDescription !== originalDescription) {
        const success = await sendPatchUpdate({
          description: editedDescription,
        });
        if (!success) {
          return;
        }
        setOriginalDescription(editedDescription);
        setData((old) =>
          old ? { ...old, description: editedDescription } : old,
        );
      }
    }
    setIsEditingDescription(!isEditingDescription);
  };

  const handleDeleteGroup = () => {
    if (!uuid) return;

    const doDelete = async () => {
      setDeleting(true);
      try {
        const ok = await deleteRemoteGroup(uuid);
        if (!ok) {
          setError('Löschen fehlgeschlagen');
          setDeleting(false);
          return;
        }
        await removeGroupId(uuid);
        router.replace('/');
      } catch (err) {
        console.error('Error deleting group', err);
        setError('Löschen fehlgeschlagen');
      } finally {
        setDeleting(false);
      }
    };

    // Block deleting the only stored group
    (async () => {
      try {
        const ids = await loadStoredGroupIds();
        if (ids.length <= 1) {
          // Show German message: cannot delete the only group
          const message = 'Du kannst deine einzige Gruppe nicht löschen.';
          if (Platform.OS === 'web') {
            window.alert(message);
            return;
          }
          Alert.alert('Löschen nicht möglich', message, [{ text: 'OK' }]);
          return;
        }

        if (Platform.OS === 'web') {
          const confirmed = window.confirm(
            'Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
          );
          if (!confirmed) return;
          void doDelete();
          return;
        }

        Alert.alert(
          'Gruppe löschen',
          'Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden?',
          [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Löschen',
              style: 'destructive',
              onPress: () => void doDelete(),
            },
          ],
        );
      } catch (err) {
        console.error('Fehler beim Prüfen der gespeicherten Gruppen:', err);
        // Fall back to confirmation if checking storage fails
        if (Platform.OS === 'web') {
          const confirmed = window.confirm(
            'Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
          );
          if (!confirmed) return;
          void doDelete();
          return;
        }

        Alert.alert(
          'Gruppe löschen',
          'Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden?',
          [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Löschen',
              style: 'destructive',
              onPress: () => void doDelete(),
            },
          ],
        );
      }
    })();
  };

  return (
    <>
      {error === 'Group not found' ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Die Gruppe, auf die du zugreifen möchtest, existiert nicht oder
            wurde kürzlich gelöscht!
          </Text>
          <Pressable
            onPress={() => router.replace('/')}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Zur Startseite</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Stack.Screen
            options={{
              title: '',
              headerBackButtonDisplayMode: 'minimal',
              headerShadowVisible: false,
              headerStyle: {
                backgroundColor: '#fff',
              },
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: '600',
              },
            }}
          />
          
          <View style={styles.container} {...panResponder.panHandlers}>
            <View style={[styles.row, styles.rowWithHamburger]}> 
              {showHamburger && (
                <View style={styles.hamburgerContainer}>
                  <HamburgerButton
                    onPress={toggleDrawer}
                    color={Colors[colorScheme ?? 'light'].text}
                  />
                </View>
              )}

              <View style={styles.titleCenterContainer} pointerEvents="none">
                {isEditingName ? (
                  <TextInput
                    style={styles.titleInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    autoFocus
                    onSubmitEditing={handleEditNameClick}
                    onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
                  />
                ) : (
                  <Text
                    style={styles.title}
                    onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
                  >
                    {data?.name ?? 'Lädt...'}
                  </Text>
                )}
              </View>

              {/* edit button positioned dynamically to hug right of title */}
              <Pressable
                onPress={handleEditNameClick}
                style={[
                  styles.editButtonAbsolute,
                  {
                    left: Math.min(
                      Math.max((width / 2) + titleWidth / 2 + 8, 56),
                      // keep inside screen with 8px margin and ~40px button
                      Math.max(width - 40 - 8, 56),
                    ),
                    minWidth: 40,
                  },
                ]}
                accessibilityLabel="Edit group name"
                hitSlop={8}
              >
                <IconSymbol size={20} name="pencil" color="#999" />
              </Pressable>
            </View>

            <View style={styles.headerSpacer} />

            <View style={styles.row}>
              <View style={styles.titleCenterContainer} pointerEvents="none">
                {isEditingDescription ? (
                  <TextInput
                    style={styles.descriptionInput}
                    value={editedDescription}
                    onChangeText={setEditedDescription}
                    multiline
                    autoFocus
                    onSubmitEditing={handleEditDescriptionClick}
                    onLayout={(e) => setDescriptionWidth(e.nativeEvent.layout.width)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Enter') {
                        handleEditDescriptionClick();
                      }
                    }}
                  />
                ) : (
                  <Text
                    style={styles.description}
                    onLayout={(e) => setDescriptionWidth(e.nativeEvent.layout.width)}
                  >
                    {data?.description ?? 'Beschreibung lädt...'}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={handleEditDescriptionClick}
                style={[
                  styles.editButtonAbsolute,
                  {
                    left: Math.min(
                      Math.max((width / 2) + descriptionWidth / 2 + 8, 56),
                      Math.max(width - 40 - 8, 56),
                    ),
                    minWidth: 40,
                  },
                ]}
                accessibilityLabel="Edit group description"
                hitSlop={8}
              >
                <IconSymbol size={20} name="pencil" color="#999" />
              </Pressable>
            </View>

            <View
              style={[
                styles.deleteFooter,
                { bottom: Math.max(insets.bottom + 12, 16) },
              ]}
            >
              <Pressable
                onPress={handleDeleteGroup}
                style={[styles.deleteButton, { width: '100%' }]}
                disabled={deleting}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Lösche…' : 'Gruppe löschen'}
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 28,
    textAlign: 'center',
    color: '#11181C',
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    padding: 4,
    textAlign: 'center',
    color: '#11181C',
  },
  titleCenterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  hamburgerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 8,
    zIndex: 10,
  },
  rowWithHamburger: {
    marginTop: 8,
    position: 'relative',
  },
  editButtonAbsolute: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 8,
  },
  headerSpacer: {
    height: 38,
  },
  deleteFooter: {
    position: 'absolute',
    left: 16,
    right: 16,
    // bottom set dynamically to respect safe area
    zIndex: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  descriptionInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    padding: 4,
    minHeight: 40,
    textAlign: 'center',
    color: '#11181C',
  },
  editButton: {
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 16,
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
