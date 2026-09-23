import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const OVERLAY_DURATION_MS = 540;

/** A brief branded bridge between the native launch screen and the app UI. */
export function SecureSmsSplashOverlay() {
  const [isVisible, setIsVisible] = useState(true);
  const hasHiddenNativeSplash = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(false), OVERLAY_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (!isVisible) return null;

  return (
    <View
      onLayout={() => {
        if (hasHiddenNativeSplash.current) return;
        hasHiddenNativeSplash.current = true;
        void SplashScreen.hideAsync();
      }}
      pointerEvents="none"
      style={styles.overlay}>
      <View style={styles.markOuter}>
        <View style={styles.markInner}>
          <Text style={styles.markLetter}>S</Text>
        </View>
      </View>
      <Text style={styles.name}>SecureSMS</Text>
      <Text style={styles.tagline}>MESSAGES LOCAUX</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: '#171D42',
    justifyContent: 'center',
    zIndex: 1000,
  },
  markOuter: {
    alignItems: 'center',
    backgroundColor: '#697AFF',
    borderRadius: 28,
    height: 88,
    justifyContent: 'center',
    marginBottom: 20,
    transform: [{ rotate: '45deg' }],
    width: 88,
  },
  markInner: {
    alignItems: 'center',
    borderColor: '#CDD4FF',
    borderRadius: 19,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    width: 56,
  },
  markLetter: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#BFC8FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 6,
  },
});
