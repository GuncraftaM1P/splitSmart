import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { loadStoredGroupIds } from '@/lib/groupService';

export default function Index() {
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const storedIds = await loadStoredGroupIds();

      if (storedIds.length > 0) {
        setGroupId(storedIds[0]);
      }
    }

    init();
  }, []);

  if (!groupId) {
    // No group to redirect to — render a blank white page (sidebar handles persistence)
    return <View style={styles.empty} />;
  }

  return <Redirect href={`/group/${groupId}`} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  empty: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
