import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type RootDetectionStatus = 'not-detected' | 'detected' | 'unavailable';

export async function detectRootStatus(): Promise<RootDetectionStatus> {
  if (Platform.OS !== 'android' || !Device.isDevice) return 'unavailable';

  try {
    return (await Device.isRootedExperimentalAsync()) ? 'detected' : 'not-detected';
  } catch {
    return 'unavailable';
  }
}
