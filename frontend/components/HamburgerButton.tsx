import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type HamburgerButtonProps = {
  onPress: () => void;
  color?: string;
};

export default function HamburgerButton({
  onPress,
  color = '#000',
}: HamburgerButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      accessibilityLabel="Open menu"
      accessibilityRole="button"
    >
      <View style={[styles.line, { backgroundColor: color }]} />
      <View style={[styles.line, { backgroundColor: color }]} />
      <View style={[styles.line, { backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  line: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
    marginVertical: 2.5,
  },
});
