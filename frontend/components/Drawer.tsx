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
  // Drawer should fill 3/4 of the screen on mobile
  const drawerWidth = Math.round(screenWidth * 0.75);
  const slideAnim = React.useRef(new Animated.Value(-drawerWidth)).current;
  const [mounted, setMounted] = React.useState(visible);

  // Keep mounted while animating out so close animation is visible
  React.useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (visible) {
      setMounted(true);
      animation = Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      });
      animation.start();
    } else {
      animation = Animated.timing(slideAnim, {
        toValue: -drawerWidth,
        duration: 200,
        useNativeDriver: true,
      });
      animation.start(() => {
        // unmount after animation completes
        setMounted(false);
      });
    }

    return () => {
      animation && animation.stop();
    };
  }, [visible, slideAnim, drawerWidth]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
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
        {/* keep backdrop transparent so underlying content isn't darkened */}
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
    backgroundColor: 'transparent',
  },
  drawer: {
    height: '100%',
    backgroundColor: '#fff',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.25)',
    elevation: 16,
  },
});
