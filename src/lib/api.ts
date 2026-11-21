import { Platform } from 'react-native';

const baseUrl = process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export type Role = 'BUYER' | 'SELLER' | 'BROKER';
export type Account = { id: string; name: string; email: string; role: Role; createdAt: string };
export type AuthResult = { user: Account; accessToken: string };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const error = payload as { error?: { code?: string; message?: string } };
      throw new ApiError(error.error?.message ?? error.error?.code ?? 'Request failed', response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Unable to connect to LandConnect. Check that the API is running.');
  } finally {
    clearTimeout(timeout);
  }
}
