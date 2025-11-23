import {
  StyleSheet,
  Pressable,
  TextInput,
  View,
  Text,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useState, useRef, useContext, useCallback, useEffect } from 'react';
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

  const { width } = useWindowDimensions();
  const { toggleDrawer } = useContext(DrawerContext);
  const colorScheme = useColorScheme();
  const showHamburger = width < 768;
  const router = useRouter();

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
      'Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => void doDelete(),
        },
      ],
    );
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
              headerLeft: showHamburger
                ? () => (
                    <HamburgerButton
                      onPress={toggleDrawer}
                      color={Colors[colorScheme ?? 'light'].text}
                    />
                  )
                : undefined,
            }}
          />

          <View style={styles.container}>
            <View style={styles.row}>
              {isEditingName ? (
                <TextInput
                  style={styles.titleInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  autoFocus
                  onSubmitEditing={handleEditNameClick}
                />
              ) : (
                <Text style={styles.title}>{data?.name ?? 'Lädt...'}</Text>
              )}
              <Pressable
                onPress={handleEditNameClick}
                style={styles.editButton}
              >
                <IconSymbol size={20} name="pencil" color="#999" />
              </Pressable>
            </View>

            <View style={styles.row}>
              {isEditingDescription ? (
                <TextInput
                  style={styles.descriptionInput}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  multiline
                  autoFocus
                  onSubmitEditing={handleEditDescriptionClick}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Enter') {
                      handleEditDescriptionClick();
                    }
                  }}
                />
              ) : (
                <Text style={styles.description}>
                  {data?.description ?? 'Beschreibung lädt...'}
                </Text>
              )}
              <Pressable
                onPress={handleEditDescriptionClick}
                style={styles.editButton}
              >
                <IconSymbol size={20} name="pencil" color="#999" />
              </Pressable>
            </View>

            <View style={styles.row}>
              <Pressable
                onPress={handleDeleteGroup}
                style={styles.deleteButton}
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
