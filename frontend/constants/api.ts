export const getBackendURL = () => {
  if (window.location.origin.includes('localhost:')) {
    return origin.replace(':8081', ':8787') + '/api/';
  }

  const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (apiUrl) {
    return apiUrl;
  }

  // Fallback
  return 'https://dev.splitsmart.de/api/';
};
