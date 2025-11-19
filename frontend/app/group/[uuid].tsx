import { StyleSheet, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getBackendURL } from '@/constants/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface GroupExpense {
  id: number;
  description: string;
  paidFor: string[];
  paidBy: string;
}

interface GroupInfo {
  name: string;
  description: string;
  members: string[];
  expenses: GroupExpense[];
}

export default function GroupScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const [data, setData] = useState<GroupInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');

  const backendURL = getBackendURL();

  useEffect(() => {
    if (!uuid) return;

    (async () => {
      try {
        const resp = await fetch(`${backendURL}groups/${uuid}/info`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!resp.ok) {
          setError('Group not found');
          return;
        }

        const json = await resp.json() as GroupInfo;
        setData(json);
        setEditedName(json.name);
        setOriginalName(json.name);
        setEditedDescription(json.description);
        setOriginalDescription(json.description);
      } catch (err) {
        setError('Error loading group');
        console.error('Error fetching data:', err);
      }
    })();
  }, [uuid]);

  const sendPatchUpdate = async (updates: {
    name?: string;
    description?: string;
  }) => {
    if (!uuid) {
      return false;
    }
    try {
      const res = await fetch(
        `${backendURL}groups/${uuid}/update`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        },
      );
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
        setData(old => (old ? { ...old, name: trimmedName } : old));
      }
    }
    setIsEditingName(!isEditingName);
  };

  const handleEditDescriptionClick = async () => {
    if (isEditingDescription) {
      if (editedDescription !== originalDescription) {
        const success = await sendPatchUpdate({ description: editedDescription });
        if (!success) {
          return;
        }
        setOriginalDescription(editedDescription);
        setData(old => (old ? { ...old, description: editedDescription } : old));
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
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.row}>
          {isEditingName ? (
            <TextInput
              style={styles.titleInput}
              value={editedName}
              onChangeText={setEditedName}
              autoFocus
              onSubmitEditing={handleEditNameClick}
            />
          ) : (
            <ThemedText type="title" style={styles.title}>
              {data?.name ?? 'Loading...'}
            </ThemedText>
          )}
          <Pressable onPress={handleEditNameClick} style={styles.editButton}>
            <IconSymbol 
              size={20} 
              name="pencil" 
              color="#999" 
            />
          </Pressable>
        </ThemedView>
        
        <ThemedView style={styles.row}>
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
            <ThemedText style={styles.description}>
              {data?.description ?? 'Loading description...'}
            </ThemedText>
          )}
          <Pressable onPress={handleEditDescriptionClick} style={styles.editButton}>
            <IconSymbol 
              size={20} 
              name="pencil" 
              color="#999" 
            />
          </Pressable>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 28,
    textAlign: 'center',
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    padding: 4,
    textAlign: 'center',
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
  },
  editButton: {
    marginLeft: 4,
  },
});