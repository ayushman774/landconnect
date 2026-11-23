import * as SecureStore from 'expo-secure-store';
import { api } from './api';

export type Conversation = {
  id: string;
  unreadCount: number;
  participants: { userId: string; user: { id: string; name: string; role: string } }[];
  messages: Message[];
};
export type Message = { id: string; conversationId: string; senderId: string; body: string; createdAt: string };

async function authenticated<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = await SecureStore.getItemAsync('landconnect.accessToken');
  if (!token) throw new Error('Sign in to use messaging.');
  return api<T>(path, { method, body, token });
}

export async function getConversations() {
  return authenticated<{ conversations: Conversation[]; unreadCount: number }>('/api/conversations');
}
export async function startConversation(recipientId: string) {
  return authenticated<{ conversation: Conversation }>('/api/conversations', 'POST', { recipientId });
}
export async function getMessages(conversationId: string) {
  return authenticated<{ messages: Message[] }>(`/api/conversations/${conversationId}/messages`);
}
export async function sendMessage(conversationId: string, body: string) {
  return authenticated<{ message: Message }>(`/api/conversations/${conversationId}/messages`, 'POST', { body });
}

export async function markConversationRead(id: string) {
  return authenticated<{ unreadCount: number }>(`/api/conversations/${id}/read`, 'POST');
}
