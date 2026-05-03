// Central API configuration.
// VITE_API_URL is read from the frontend environment.

export const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
