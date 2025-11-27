import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  PanResponder,
  useWindowDimensions,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBackendURL } from '@/constants/api';
import { fetchGroupDetails } from '@/lib/groupService';

export default function AddExpenseScreen() {
  const { uuid, expenseId } = useLocalSearchParams<{ uuid: string; expenseId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Determine if we are editing an existing expense
  const isEditing = Boolean(expenseId);

  const [group, setGroup] = useState<any | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [paidFor, setPaidFor] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingExpense, setLoadingExpense] = useState(isEditing);
  const [deleting, setDeleting] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      if (!uuid) return;
      try {
        const g = await fetchGroupDetails(uuid);
        if (!isMountedRef.current) return;
        setGroup(g);

        // If editing, prefill form with existing expense data
        if (expenseId && g?.expenses) {
          const expense = g.expenses.find((e: any) => e.id === expenseId);
          if (expense) {
            setDescription(expense.description ?? '');
            setAmount(String(expense.amount ?? ''));
            setPaidBy(expense.paidBy ?? '');
            setPaidFor(Array.isArray(expense.paidFor) ? expense.paidFor : []);
          }
        }
        setLoadingExpense(false);
      } catch (err) {
        console.error('Failed to load group', err);
        setLoadingExpense(false);
      }
    })();
    return () => {
      isMountedRef.current = false;
    };
  }, [uuid, expenseId]);

  // PanResponder to go back on left->right swipe
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e, gs) => {
        return (gs.x0 ?? 0) < 30;
      },
      onMoveShouldSetPanResponder: (e, gs) => {
        return (
          Math.abs(gs.dx) > 8 &&
          Math.abs(gs.dx) > Math.abs(gs.dy) &&
          gs.dx > 8 &&
          (gs.x0 ?? 0) < 30
        );
      },
      onPanResponderRelease: (e, gs) => {
        if (gs.dx > 60) {
          try {
            router.back();
          } catch (err) {
            // ignore
          }
        }
      },
    }),
  ).current;

  const backendURL = getBackendURL();

  const handleSave = async () => {
    if (!uuid) return;
    setSaving(true);
    setError('');
    // Replace commas with dots so backend parses decimals correctly
    const sanitizedAmount = (amount ?? '').toString().replace(/,/g, '.');
    const body = {
      description,
      amount: Number(sanitizedAmount) || 0,
      paidBy,
      paidFor,
      ...(isEditing && expenseId ? { expenseId } : {}),
    } as any;
    try {
      const res = await fetch(`${backendURL}groups/${uuid}/expenses`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Fehler');
        setSaving(false);
        return;
      }
      // success — go back to group
      router.back();
    } catch (err) {
      console.error('Error saving expense', err);
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Title based on mode
  const screenTitle = isEditing ? 'Ausgabe bearbeiten' : 'Neue Ausgabe';
  const saveButtonText = saving
    ? 'Speichern…'
    : isEditing
    ? 'Aktualisieren'
    : 'Speichern';

  // Delete expense handler (only for edit mode)
  const handleDelete = async () => {
    if (!uuid || !expenseId) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`${backendURL}groups/${uuid}/expenses`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Fehler beim Löschen');
        setDeleting(false);
        return;
      }
      // success — go back to group
      router.back();
    } catch (err) {
      console.error('Error deleting expense', err);
      setError('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Möchtest du diese Ausgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!',
      );
      if (!confirmed) return;
      void handleDelete();
      return;
    }

    Alert.alert(
      'Ausgabe löschen',
      'Möchtest du diese Ausgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => void handleDelete(),
        },
      ],
    );
  };

  return (
    <View
      style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}
      {...panRef.panHandlers}
    >
      <Stack.Screen options={{ title: screenTitle }} />

      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Zurück</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{screenTitle}</Text>
        <View style={{ width: 64 }} />
      </View>

      {loadingExpense ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Lade Ausgabe…</Text>
        </View>
      ) : (
      <ScrollView
        style={styles.form}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.field}>
          <Text style={styles.label}>Beschreibung</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="z. B. Abendessen"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Betrag</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="z. B. 12.50"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bezahlt von</Text>
          {(group?.members ?? []).map((m: string) => (
            <Pressable
              key={m}
              style={[
                styles.selectRow,
                paidBy === m ? styles.selectRowActive : null,
              ]}
              onPress={() => setPaidBy(m)}
            >
              <Text style={styles.selectText}>{m}</Text>
              <Text style={{ color: paidBy === m ? '#007AFF' : '#ccc' }}>
                {paidBy === m ? '●' : '○'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Teilnehmende (Für)</Text>
          {(group?.members ?? []).map((m: string) => {
            const sel = paidFor.includes(m);
            return (
              <Pressable
                key={m}
                style={[styles.selectRow, sel ? styles.selectRowActive : null]}
                onPress={() => {
                  if (sel) setPaidFor((p) => p.filter((x) => x !== m));
                  else setPaidFor((p) => [...p, m]);
                }}
              >
                <Text style={styles.selectText}>{m}</Text>
                <Text style={{ color: sel ? '#007AFF' : '#ccc' }}>
                  {sel ? '✓' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.buttonsRow}>
          <Pressable
            style={[styles.btn, styles.btnCancel]}
            onPress={() => router.back()}
            disabled={saving || deleting}
          >
            <Text style={styles.btnCancelText}>Abbrechen</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSave]}
            onPress={handleSave}
            disabled={saving || deleting}
          >
            <Text style={styles.btnSaveText}>{saveButtonText}</Text>
          </Pressable>
        </View>

        {/* Delete button only in edit mode */}
        {isEditing && (
          <Pressable
            style={[styles.btn, styles.btnDelete, { marginTop: 24 }]}
            onPress={confirmDelete}
            disabled={saving || deleting}
          >
            <Text style={styles.btnDeleteText}>
              {deleting ? 'Löschen…' : 'Ausgabe löschen'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backButton: { width: 64 },
  backText: { color: '#007AFF', fontWeight: '600' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  form: { paddingHorizontal: 16 },
  field: { marginBottom: 12 },
  label: { color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  selectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectRowActive: { backgroundColor: '#f0f8ff' },
  selectText: { color: '#111' },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  btnCancel: { backgroundColor: '#f0f0f0' },
  btnCancelText: { color: '#333', fontWeight: '700' },
  btnSave: { backgroundColor: '#007AFF' },
  btnSaveText: { color: '#fff', fontWeight: '700' },
  error: { color: '#c00', marginTop: 6 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  btnDelete: {
    backgroundColor: '#f44336',
    width: '100%',
    alignItems: 'center',
  },
  btnDeleteText: {
    color: '#fff',
    fontWeight: '700',
  },
});
