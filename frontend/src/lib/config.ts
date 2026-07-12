/**
 * Centralized application configuration.
 * All environment-dependent values should be accessed through this module
 * instead of using import.meta.env directly or hardcoding URLs.
 */

/** Display name of the application */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'DhaagaOS';

/** Base API URL — empty string in production (same-origin), full URL in dev */
export const API_URL = import.meta.env.VITE_API_URL || '';

/** Base URL for accessing stored/uploaded files */
export const STORAGE_URL = `${API_URL}/storage`;
