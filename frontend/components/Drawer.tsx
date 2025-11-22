import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';

type DrawerProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Drawer({ visible, onClose, children }: DrawerProps) {
  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = Math.min(280, screenWidth * 0.85);
  const slideAnim = React.useRef(new Animated.Value(-drawerWidth)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -drawerWidth,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, drawerWidth]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.drawer,
            { width: drawerWidth, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {children}
        </Animated.View>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    height: '100%',
    backgroundColor: '#fff',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.25)',
    elevation: 16,
  },
});
