import * as SecureStore from 'expo-secure-store';
import { api } from './api';

export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL';
export type Listing = {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  priceRupees: number;
  areaSqFt: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  images: { id: string; url: string; position: number }[];
  owner: { id: string; name: string; role: string };
};

export const formatPrice = (value: number) => '₹' + value.toLocaleString('en-IN');

export async function browseProperties(search = '', type?: PropertyType) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (type) params.set('type', type);
  return api<{ properties: Listing[]; nextCursor: string | null }>(`/api/properties?${params.toString()}`);
}

export async function createListing(input: {
  title: string; description: string; type: PropertyType; priceRupees: number;
  areaSqFt: number; address: string; imageUrls: string[]; publish: boolean;
}) {
  const token = await SecureStore.getItemAsync('landconnect.accessToken');
  if (!token) throw new Error('Sign in as a seller or broker to create listings.');
  return api<{ property: Listing }>('/api/properties', { method: 'POST', token, body: input });
}
