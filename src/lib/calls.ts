import * as SecureStore from 'expo-secure-store';
import { api } from './api';

export type CallType = 'AUDIO' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ACCEPTED' | 'REJECTED' | 'ENDED' | 'MISSED';
export type Call = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  status: CallStatus;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  callerName?: string;
};

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = await SecureStore.getItemAsync('landconnect.accessToken');
  if (!token) throw new Error('Sign in to make calls.');
  return api<T>(path, { token, method, body });
}

export async function startCall(conversationId: string, type: CallType): Promise<Call> {
  return (await request<{ call: Call }>('/api/calls', 'POST', { conversationId, type })).call;
}

export async function getIncomingCalls(): Promise<Call[]> {
  return (await request<{ calls: Call[] }>('/api/calls/incoming')).calls;
}

export async function getCall(id: string): Promise<Call> {
  return (await request<{ call: Call }>(`/api/calls/${id}`)).call;
}

export async function updateCall(id: string, action: 'accept' | 'reject' | 'end'): Promise<Call> {
  return (await request<{ call: Call }>(`/api/calls/${id}/${action}`, 'POST')).call;
}

export async function getCallConnection(id: string): Promise<{ url: string; token: string; call: Call }> {
  return request(`/api/calls/${id}/token`, 'POST');
}
