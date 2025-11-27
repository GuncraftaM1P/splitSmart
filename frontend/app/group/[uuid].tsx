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
  addGroupMember,
  removeGroupMember,
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
  const [memberName, setMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
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
  const isEditingNameRef = useRef(isEditingName);
  const isEditingDescriptionRef = useRef(isEditingDescription);

  useEffect(() => {
    isEditingNameRef.current = isEditingName;
  }, [isEditingName]);

  useEffect(() => {
    isEditingDescriptionRef.current = isEditingDescription;
  }, [isEditingDescription]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e, gs) => {
        // start only when touching near left edge on mobile and not editing
        return (
          showHamburger &&
          !isEditingNameRef.current &&
          !isEditingDescriptionRef.current &&
          (gs.x0 ?? 0) < 30
        );
      },
      onMoveShouldSetPanResponder: (e, gs) => {
        // start when horizontal movement dominates and to the right
        return (
          showHamburger &&
          !isEditingNameRef.current &&
          !isEditingDescriptionRef.current &&
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
  const [showAddInput, setShowAddInput] = useState(false);
  // expense modal removed — new screen will handle adding expenses

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

  // Small helper component to render a grid of member balance cards
  function BalancesGrid({
    data,
    removingMember,
    onRemove,
    onStartAdd,
  }: {
    data: GroupDetails | null;
    removingMember: string | null;
    onRemove: (name: string) => void;
    onStartAdd: () => void;
  }) {
    const members = data?.members ?? [];

    // Compute balances from expenses: for each expense with amount, split equally among paidFor.
    const balances: Record<string, number> = {};
    (members || []).forEach((m) => (balances[m] = 0));

    (data?.expenses ?? []).forEach((exp: any) => {
      const amount = Number(exp?.amount ?? 0) || 0;
      const paidFor: string[] = Array.isArray(exp?.paidFor) ? exp.paidFor : [];
      const share = paidFor.length > 0 ? amount / paidFor.length : 0;
      const paidBy = exp?.paidBy;

      // payer gets credited the full amount (they paid), each participant owes share
      if (paidBy && typeof paidBy === 'string') {
        if (!(paidBy in balances)) balances[paidBy] = 0;
        balances[paidBy] += amount;
      }

      paidFor.forEach((p) => {
        if (!(p in balances)) balances[p] = 0;
        balances[p] -= share;
      });
    });

    const format = (n: number) => {
      const sign = n > 0 ? '+' : n < 0 ? '-' : '';
      return `${sign}€${Math.abs(n).toFixed(2)}`;
    };

    return (
      <View style={styles.balancesGrid}>
        {members.map((name) => {
          const bal = balances[name] ?? 0;
          const positive = bal > 0.005;
          const negative = bal < -0.005;
          return (
            <View
              key={name}
              style={[
                styles.memberCard,
                positive
                  ? styles.memberCardPositive
                  : negative
                  ? styles.memberCardNegative
                  : null,
              ]}
            >
              <Text style={styles.memberCardName}>{name}</Text>
              <Text style={styles.memberBalance}>{format(bal)}</Text>
              <Pressable
                style={styles.removeMemberSmall}
                onPress={() => onRemove(name)}
                disabled={removingMember === name}
              >
                <Text style={styles.removeMemberSmallText}>
                  {removingMember === name ? '…' : '✕'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {/* Add member card */}
        <Pressable
          style={[styles.memberCard, styles.addCard]}
          onPress={onStartAdd}
        >
          <Text style={styles.addCardText}>+ Mitglied hinzufügen</Text>
        </Pressable>
      </View>
    );
  }

  // Initial fetch and polling every 5 seconds while screen is focused
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!uuid || groupMissing) return;

      isMountedRef.current = true;
      fetchGroupInfo();

      pollRef.current = setInterval(() => {
        if (isEditingNameRef.current || isEditingDescriptionRef.current) return;

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

  // Expense API helpers (use backend routes: PATCH to replace expense, DELETE to remove by id)
  const patchExpense = async (expense: any) => {
    if (!uuid) return false;
    try {
      const res = await fetch(`${backendURL}groups/${uuid}/expenses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: expense.id,
          description: expense.description,
          amount: Number(expense.amount),
          paidBy: expense.paidBy,
          paidFor: expense.paidFor,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || 'Failed to update expense');
        return false;
      }
      setError('');
      return true;
    } catch (err) {
      console.error('patchExpense error', err);
      setError('Failed to update expense');
      return false;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!uuid) return false;
    try {
      const res = await fetch(`${backendURL}groups/${uuid}/expenses`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || 'Failed to delete expense');
        return false;
      }
      setError('');
      return true;
    } catch (err) {
      console.error('deleteExpense error', err);
      setError('Failed to delete expense');
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
    setIsEditingName((v) => !v);
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
    setIsEditingDescription((v) => !v);
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
        'Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!.',
      );
      if (!confirmed) return;
      void doDelete();
      return;
    }

    Alert.alert(
      'Gruppe löschen',
      'Möchtest du diese Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!',
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

  const handleAddMember = async () => {
    const name = memberName.trim();
    if (!name) return;
    setAddingMember(true);
    const ok = await addGroupMember(uuid!, name);
    setAddingMember(false);
    if (ok) {
      setMemberName('');
      fetchGroupInfo();
    } else {
      setError('Mitglied konnte nicht hinzugefügt werden');
    }
  };

  const handleRemoveMember = async (name: string) => {
    setRemovingMember(name);
    const ok = await removeGroupMember(uuid!, name);
    setRemovingMember(null);
    if (ok) {
      fetchGroupInfo();
    } else {
      setError('Mitglied konnte nicht entfernt werden');
    }
  };

  // Confirm before removing a member (web: window.confirm, native: Alert)
  const confirmRemoveMember = (name: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Möchtest du dieses Mitglied wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden!',
      );
      if (!confirmed) return;
      void handleRemoveMember(name);
      return;
    }

    Alert.alert(
      'Mitglied entfernen',
      'Möchtest du dieses Mitglied wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden!',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => void handleRemoveMember(name),
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

              <View
                style={styles.titleCenterContainer}
                pointerEvents={isEditingName ? 'auto' : 'none'}
              >
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
                      Math.max(width / 2 + titleWidth / 2 + 8, 56),
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
              <View
                style={styles.titleCenterContainer}
                pointerEvents={isEditingDescription ? 'auto' : 'none'}
              >
                {isEditingDescription ? (
                  <TextInput
                    style={styles.descriptionInput}
                    value={editedDescription}
                    onChangeText={setEditedDescription}
                    multiline
                    autoFocus
                    onSubmitEditing={handleEditDescriptionClick}
                    onLayout={(e) =>
                      setDescriptionWidth(e.nativeEvent.layout.width)
                    }
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Enter') {
                        handleEditDescriptionClick();
                      }
                    }}
                  />
                ) : (
                  <Text
                    style={styles.description}
                    onLayout={(e) =>
                      setDescriptionWidth(e.nativeEvent.layout.width)
                    }
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
                      Math.max(width / 2 + descriptionWidth / 2 + 8, 56),
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

            {/* Balances grid */}
            <View style={styles.balancesSection}>
              <Text style={styles.membersTitle}>Teilnehmer</Text>

              {/* Optional inline add member input shown when user taps + card */}
              {/** showAddInput controls rendering of the input box */}
              <BalancesGrid
                data={data}
                removingMember={removingMember}
                onRemove={confirmRemoveMember}
                onStartAdd={() => setShowAddInput(true)}
              />

              {showAddInput ? (
                <View style={styles.addMemberRowInline}>
                  <TextInput
                    style={styles.memberInput}
                    value={memberName}
                    onChangeText={setMemberName}
                    placeholder="Name eingeben"
                    editable={!addingMember}
                    onSubmitEditing={async () => {
                      await handleAddMember();
                      setShowAddInput(false);
                    }}
                  />
                  <Pressable
                    style={styles.addMemberButton}
                    onPress={async () => {
                      await handleAddMember();
                      setShowAddInput(false);
                    }}
                    disabled={addingMember || !memberName.trim()}
                  >
                    <Text style={styles.addMemberButtonText}>
                      {addingMember ? 'Hinzufügen…' : 'Hinzufügen'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowAddInput(false);
                      setMemberName('');
                    }}
                    style={styles.cancelAddButton}
                  >
                    <Text style={styles.cancelAddButtonText}>Abbrechen</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Expenses list */}
            <View style={styles.balancesSection}>
              <View
                style={[
                  styles.row,
                  {
                    justifyContent: 'space-evenly',
                    marginBottom: 8,
                  },
                ]}
              >
                <Text style={styles.membersTitleSmall}>Ausgaben</Text>
                <Pressable
                  style={styles.addExpenseButton}
                  onPress={() =>
                    router.push(`/add-expense/${uuid}` as unknown as any)
                  }
                >
                  <Text style={styles.addExpenseButtonText}>+</Text>
                </Pressable>
              </View>

              {/* Expenses list rows */}
              <View style={styles.expenseList}>
                {(data?.expenses ?? [])
                  .slice()
                  .sort((a: any, b: any) => (a.id < b.id ? 1 : -1))
                  .map((exp: any) => {
                    const amount = Number(exp?.amount ?? 0) || 0;
                    return (
                      <View key={exp.id} style={styles.expenseRow}>
                        <Pressable
                          onPress={() =>
                            router.push(
                              `/add-expense/${uuid}?expenseId=${exp.id}` as unknown as any,
                            )
                          }
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        >
                          <Text style={styles.expensePrice}>
                            €{amount.toFixed(2)}
                          </Text>
                          <Text numberOfLines={1} style={styles.expenseTitle}>
                            {exp.description}
                          </Text>
                          <View style={styles.expenseArrow}>
                            <IconSymbol
                              size={18}
                              name="chevron.right"
                              color="#ccc"
                            />
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
              </View>
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
    position: 'relative',
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
  membersSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f7f8fa',
    borderRadius: 12,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
  },
  addMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  memberInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addMemberButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addMemberButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  membersList: {
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberName: {
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  removeMemberButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f44336',
  },
  removeMemberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noMembersText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  balancesSection: {
    marginTop: 32,
  },
  balancesGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  memberCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  memberCardPositive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#b7f5c8',
  },
  memberCardNegative: {
    backgroundColor: '#fff1f0',
    borderColor: '#ffcccc',
  },
  memberCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  memberBalance: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  removeMemberSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
  },
  removeMemberSmallText: {
    color: '#999',
    fontSize: 12,
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f9ff',
    borderStyle: 'dashed',
  },
  addCardText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addMemberRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  cancelAddButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelAddButtonText: {
    color: '#666',
  },
  membersTitleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  addExpenseButton: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExpenseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  expenseList: {
    marginTop: 4,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  expensePrice: {
    width: 80,
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  expenseTitle: {
    flex: 1,
    color: '#888',
    marginRight: 8,
  },
  expenseArrow: {
    width: 24,
    alignItems: 'flex-end',
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
