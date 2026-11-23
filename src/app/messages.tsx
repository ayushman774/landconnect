import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';
import { getConversations, getMessages, markConversationRead, sendMessage, type Conversation, type Message } from '@/lib/messaging';

const green = '#146B53';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try { setConversations((await getConversations()).conversations); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load conversations'); }
  }, [user]);

  const loadMessages = useCallback(async (id: string) => {
    try { const result = await getMessages(id); setMessages(result.messages); await markConversationRead(id); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load messages'); }
  }, []);

  useEffect(() => { setActive(null); setMessages([]); setConversations([]); setDraft(''); void loadConversations(); }, [user?.id, loadConversations]);
  useEffect(() => {
    if (!active || !user) return;
    void loadMessages(active.id);
    const interval = setInterval(() => void loadMessages(active.id), 3000);
    return () => clearInterval(interval);
  }, [active, user?.id, loadMessages]);

  async function submit() {
    if (!active || !draft.trim() || busy) return;
    setBusy(true);
    try {
      await sendMessage(active.id, draft.trim());
      setDraft('');
      await loadMessages(active.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send message'); }
    finally { setBusy(false); }
  }

  if (!user) return <SafeAreaView style={styles.screen}><View style={styles.content}><Text style={styles.title}>Messages</Text><Text style={styles.muted}>Sign in to message buyers, sellers and brokers.</Text></View></SafeAreaView>;

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    <View style={styles.inner}>
      <View style={styles.header}>
        {active && <Pressable onPress={() => { setActive(null); void loadConversations(); }}><Text style={styles.back}>‹ Back</Text></Pressable>}
        <Text style={styles.title}>{active ? active.participants.find(p => p.userId !== user.id)?.user.name ?? 'Conversation' : 'Messages'}</Text>
        <Pressable onPress={() => active ? void loadMessages(active.id) : void loadConversations()}><Text style={styles.refresh}>Refresh</Text></Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {active ? <>
        <FlatList style={styles.list} data={messages} keyExtractor={item => item.id} renderItem={({ item }) =>
          <View style={[styles.bubble, item.senderId === user.id ? styles.own : styles.theirs]}>
            <Text style={[styles.body, item.senderId === user.id && styles.ownText]}>{item.body}</Text>
            <Text style={[styles.time, item.senderId === user.id && styles.ownText]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        } ListEmptyComponent={<Text style={styles.muted}>No messages yet. Say hello!</Text>} />
        <View style={styles.composer}>
          <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Type a message..." multiline maxLength={2000} />
          <Pressable disabled={busy || !draft.trim()} onPress={() => void submit()} style={styles.send}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.sendText}>Send</Text>}</Pressable>
        </View>
      </> : <FlatList style={styles.list} data={conversations} keyExtractor={item => item.id} onRefresh={() => void loadConversations()} refreshing={false}
        renderItem={({ item }) => {
          const peer = item.participants.find(p => p.userId !== user.id)?.user;
          return <Pressable style={styles.row} onPress={() => setActive(item)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{peer?.name?.slice(0, 1).toUpperCase() ?? '?'}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.peer}>{peer?.name ?? 'Conversation'}</Text><Text style={styles.muted} numberOfLines={1}>{item.messages[0]?.body ?? 'Start chatting'}</Text></View>
            {!!item.unreadCount && <View style={styles.badge}><Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View>}
            <Text style={styles.arrow}>›</Text>
          </Pressable>;
        }} ListEmptyComponent={<Text style={styles.muted}>No conversations yet. Open a property on Home and contact its seller.</Text>} />}
    </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F8' }, content: { flex: 1 }, inner: { flex: 1, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { flex: 1, fontSize: 23, fontWeight: '800', color: green },
  back: { color: green, fontWeight: '700' }, refresh: { color: green, fontWeight: '700' },
  list: { flex: 1 }, muted: { color: '#65747D', fontSize: 13, marginTop: 5, lineHeight: 20 },
  error: { color: '#B3261E', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 14, marginBottom: 10 },
  avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#DDF0E8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: green, fontWeight: '800' }, peer: { fontSize: 16, color: '#17242A', fontWeight: '700' }, arrow: { color: green, fontSize: 24 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 10 },
  own: { backgroundColor: green, alignSelf: 'flex-end' }, theirs: { backgroundColor: 'white', alignSelf: 'flex-start' },
  body: { fontSize: 15, color: '#17242A' }, ownText: { color: 'white' }, time: { fontSize: 10, color: '#65747D', marginTop: 6, alignSelf: 'flex-end' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 12 },
  input: { flex: 1, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 110, minHeight: 46, color: '#17242A' },
  send: { backgroundColor: green, borderRadius: 12, paddingHorizontal: 16, height: 46, justifyContent: 'center' },
  sendText: { color: 'white', fontWeight: '800' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#D52A36', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '800' },
});
