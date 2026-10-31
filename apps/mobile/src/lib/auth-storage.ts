import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

/**
 * Secure authentication storage abstraction.
 * Uses expo-secure-store for encrypted token storage on device.
 * All token operations go through this module.
 */
export const authStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
