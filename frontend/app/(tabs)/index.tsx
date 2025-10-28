import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

export default function HomeScreen() {
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

  const backendURL = window.location.origin.replace(':8081', ':8787') + '/api/';

  const [data, setData]: [GroupInfo, any] = useState<any>(null);
  useEffect(() => {
    try {
      (async () => {
        const resp = await fetch(
          backendURL + 'groups/ec07c9fe-5124-4fd3-b020-55fa0d6685a1/info',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        // Everything alright?
        if (!resp.ok) {
          setData('NOT FOUND');
          return;
        }

        const json = (await resp.json()) as GroupInfo;

        setData(json);
      })();
    } catch (error) {
      setData('');
      console.error('Error fetching data:', error);
    }
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">
          {data ? JSON.stringify(data.name) : 'Loading goup name...'}{' '}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="subtitle">
          {data ? JSON.stringify(data.description) : 'Loading description...'}{' '}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="default">
          {data ? JSON.stringify(data.members) : 'Loading members...'}{' '}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="default">
          {data ? JSON.stringify(data.expenses) : 'Loading expenses...'}{' '}
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
