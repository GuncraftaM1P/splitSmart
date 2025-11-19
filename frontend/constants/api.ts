export const getBackendURL = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin.replace(':8081', ':8787') + '/api/';
    }
    // Fallback
    return 'https://dev.splitsmart.de/api/';
};
