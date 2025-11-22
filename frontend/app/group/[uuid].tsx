import {
  StyleSheet,
  Pressable,
  TextInput,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useRef, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { getBackendURL } from '@/constants/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import HamburgerButton from '@/components/HamburgerButton';
import { DrawerContext } from '../_layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchGroupDetails, GroupDetails } from '@/lib/groupService';

export default function GroupScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const [data, setData] = useState<GroupDetails | null>(null);
  const [error, setError] = useState<string>('');
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

  const backendURL = getBackendURL();

  const fetchGroupInfo = async () => {
    if (!uuid || !isMountedRef.current) return;

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
      setError(status === 404 ? 'Group not found' : 'Error loading group');
      console.error('Error fetching data:', err);
    }
  };

  // Initial fetch and polling every 5 seconds while screen is focused
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!uuid) return;

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
    }, [uuid]),
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
    } catch (err) {
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

  return (
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
          <Pressable onPress={handleEditNameClick} style={styles.editButton}>
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
      </View>
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
});
