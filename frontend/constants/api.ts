export const getBackendURL = () => {
  const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL
  if (apiUrl) {
    return apiUrl;
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // If origin contains exp.direct (Expo tunnel), use dev.splitsmart.de
    if (origin.includes('exp.direct')) {
      return 'https://dev.splitsmart.de/api/';
    }
    return origin.replace(':8081', ':8787') + '/api/';
  }

  // Fallback
  return 'https://dev.splitsmart.de/api/';
};
