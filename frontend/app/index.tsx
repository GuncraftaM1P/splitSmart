import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import uuid from 'react-native-uuid';
import {
  loadStoredGroupIds,
  createGroup,
  appendGroupId,
} from '@/lib/groupService';

export default function Index() {
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const storedIds = await loadStoredGroupIds();

      if (storedIds.length > 0) {
        setGroupId(storedIds[0]);
      } else {
        // Create a new group
        const newId = uuid.v4() as string;
        const newGroup = await createGroup(newId);
        if (newGroup) {
          await appendGroupId(newId);
          setGroupId(newId);
        }
      }
    }

    init();
  }, []);

  if (!groupId) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
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
});
