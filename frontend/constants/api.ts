import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const getBackendURL = () => {
  console.log('[API] getBackendURL called, Platform.OS:', Platform.OS);
  
  // Check for environment variable first (highest priority)
  const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (apiUrl) {
    console.log('[API] Using EXPO_PUBLIC_BACKEND_URL:', apiUrl);
    return apiUrl;
  }

  // Web environment
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      if (window.location.origin.includes('localhost:')) {
        const url = window.location.origin.replace(':8081', ':8787') + '/api/';
        console.log('[API] Web localhost detected, using:', url);
        return url;
      }
    }
    // Production web fallback
    console.log('[API] Production web, using dev.splitsmart.de');
    return 'https://dev.splitsmart.de/api/';
  }

  // Mobile (iOS/Android) - try multiple strategies
  console.log('[API] Mobile environment detected');
  console.log('[API] Constants.expoConfig?.hostUri:', Constants.expoConfig?.hostUri);
  console.log('[API] Constants.manifest?.hostUri:', (Constants.manifest as any)?.hostUri);
  console.log('[API] Constants.manifest2?.extra?.expoGo?.debuggerHost:', 
    Constants.manifest2?.extra?.expoGo?.debuggerHost);

  // Strategy 1: Use Expo's debugger host (works in Expo Go on same network)
  let debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  
  // Strategy 2: Try manifest (legacy)
  if (!debuggerHost && (Constants.manifest as any)?.hostUri) {
    debuggerHost = (Constants.manifest as any).hostUri.split(':')[0];
  }
  
  // Strategy 3: Try manifest2 (new Expo SDK)
  if (!debuggerHost && Constants.manifest2?.extra?.expoGo?.debuggerHost) {
    debuggerHost = Constants.manifest2.extra.expoGo.debuggerHost.split(':')[0];
  }

  if (debuggerHost) {
    const url = `http://${debuggerHost}:8787/api/`;
    console.log('[API] Mobile: Using debugger host:', url);
    return url;
  }

  // Fallback: Try to use a sensible default
  // For tunnel mode, this won't work - user needs to set EXPO_PUBLIC_BACKEND_URL
  console.warn('[API] Mobile: Could not determine backend URL!');
  console.warn('[API] If using tunnel mode, set EXPO_PUBLIC_BACKEND_URL in .env or app.json');
  console.warn('[API] Falling back to localhost (likely to fail on real device)');
  
  return 'http://localhost:8787/api/';
};
