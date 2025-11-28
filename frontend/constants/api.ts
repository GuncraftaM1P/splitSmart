import { Platform } from "react-native";

export const getBackendURL = () => {
  if (Platform.OS === 'web') {
    if (window.location.origin.includes('localhost:')) {
      return window.location.origin.replace(':8081', ':8787') + '/api/';
    }
    const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (apiUrl) {
      return apiUrl;
    }
    return 'https://dev.splitsmart.de/api/';
  } else {
    const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (apiUrl) {
      return apiUrl;
    }
    return 'https://dev.splitsmart.de/api/';
  }
}
