import { useCallback, useEffect, useState } from 'react';
import { registerGlobals } from '@livekit/react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import CallRoom from '@/components/call-room';
import { getCall, getIncomingCalls, startCall, updateCall, type Call, type CallType } from '@/lib/calls';

registerGlobals();
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';
import { getConversations, getMessages, markConversationRead, sendMessage, type Conversation, type Message } from '@/lib/messaging';

const green = '#146B53';

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [outgoing, setOutgoing] = useState<Call | null>(null);
  const [connectedCall, setConnectedCall] = useState<Call | null>(null);
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

  useEffect(() => {
    if (!user) { setIncoming(null); setOutgoing(null); setConnectedCall(null); return; }
    let alive = true;
    const poll = async () => {
      try {
        const calls = await getIncomingCalls();
        if (alive) setIncoming(calls[0] ?? null);
        if (outgoing) {
          const current = await getCall(outgoing.id);
          if (!alive) return;
          if (current.status === 'ACCEPTED') { setConnectedCall(current); setOutgoing(null); }
          else if (current.status !== 'RINGING') setOutgoing(null);
        }
        if (connectedCall) {
          const current = await getCall(connectedCall.id);
          if (alive && current.status !== 'ACCEPTED') setConnectedCall(null);
        }
      } catch { /* Retry while backend is temporarily unavailable. */ }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => { alive = false; clearInterval(timer); };
  }, [user?.id, outgoing?.id, connectedCall?.id]);

  async function initiateCall(type: CallType) {
    if (!active || busy) return;
    setBusy(true);
    try { setOutgoing(await startCall(active.id, type)); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start call'); }
    finally { setBusy(false); }
  }

  async function respondToCall(accept: boolean) {
    if (!incoming) return;
    const call = incoming;
    setIncoming(null);
    try {
      const updated = await updateCall(call.id, accept ? 'accept' : 'reject');
      if (accept) setConnectedCall(updated);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not respond to call'); }
  }

  async function cancelCall() {
    if (!outgoing) return;
    const call = outgoing;
    setOutgoing(null);
    try { await updateCall(call.id, 'end'); } catch { /* Call may already have ended. */ }
  }

  async function closeCall() {
    const call = connectedCall;
    setConnectedCall(null);
    if (call) try { await updateCall(call.id, 'end'); } catch { /* Already ended. */ }
  }

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

  if (!user) return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.guestHeader}>
        <Text style={styles.guestEyebrow}>YOUR INBOX</Text>
        <Text style={styles.guestTitle}>Messages</Text>
        <Text style={styles.guestSubtitle}>All your property conversations, in one place.</Text>
      </View>
      <View style={styles.guestCenter}>
        <View style={styles.guestIllustration}>
          <View style={styles.guestIconHalo}>
            <Ionicons name="chatbubbles" size={48} color={green} />
          </View>
          <View style={styles.guestSmallIcon}>
            <Ionicons name="home-outline" size={20} color={green} />
          </View>
        </View>
        <Text style={styles.guestHeading}>Let's get the conversation started</Text>
        <Text style={styles.guestDescription}>Sign in to connect with buyers, sellers and brokers, ask about properties, and keep every conversation together.</Text>
        <Pressable style={styles.guestButton} onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel="Sign in to start messaging">
          <Text style={styles.guestButtonText}>Sign in to message</Text>
          <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
        </Pressable>
        <View style={styles.guestPrivacy}>
          <Ionicons name="lock-closed-outline" size={14} color="#77868B" />
          <Text style={styles.guestPrivacyText}>Your conversations stay in your account</Text>
        </View>
      </View>
    </SafeAreaView>
  );

  if (connectedCall) return <SafeAreaView style={{ flex: 1, backgroundColor: '#0B1920' }}><CallRoom call={connectedCall} onClose={() => void closeCall()} /></SafeAreaView>;

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    <View style={styles.inner}>
      <View style={styles.header}>
        {active && <Pressable onPress={() => { setActive(null); void loadConversations(); }}><Text style={styles.back}>‹ Back</Text></Pressable>}
        <Text style={styles.title}>{active ? active.participants.find(p => p.userId !== user.id)?.user.name ?? 'Conversation' : 'Messages'}</Text>
        <Pressable onPress={() => active ? void loadMessages(active.id) : void loadConversations()}><Text style={styles.refresh}>Refresh</Text></Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {incoming && <View style={styles.callNotice}>
        <Text style={styles.callNoticeText}>{incoming.callerName ?? 'Someone'} is calling ({incoming.type === 'VIDEO' ? 'video' : 'audio'})</Text>
        <View style={styles.callButtons}>
          <Pressable style={styles.accept} onPress={() => void respondToCall(true)}><Text style={styles.callButtonText}>Accept</Text></Pressable>
          <Pressable style={styles.reject} onPress={() => void respondToCall(false)}><Text style={styles.callButtonText}>Reject</Text></Pressable>
        </View>
      </View>}
      {outgoing && <View style={styles.callNotice}>
        <Text style={styles.callNoticeText}>Calling… waiting for an answer</Text>
        <Pressable style={styles.reject} onPress={() => void cancelCall()}><Text style={styles.callButtonText}>Cancel call</Text></Pressable>
      </View>}
      {active ? <>
        <FlatList style={styles.list} data={messages} keyExtractor={item => item.id} renderItem={({ item }) =>
          <View style={[styles.bubble, item.senderId === user.id ? styles.own : styles.theirs]}>
            <Text style={[styles.body, item.senderId === user.id && styles.ownText]}>{item.body}</Text>
            <Text style={[styles.time, item.senderId === user.id && styles.ownText]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        } ListEmptyComponent={<Text style={styles.muted}>No messages yet. Say hello!</Text>} />
        <View style={styles.callButtons}>
          <Pressable style={styles.accept} disabled={busy || !!outgoing} onPress={() => void initiateCall('AUDIO')}><Text style={styles.callButtonText}>Audio call</Text></Pressable>
          <Pressable style={styles.accept} disabled={busy || !!outgoing} onPress={() => void initiateCall('VIDEO')}><Text style={styles.callButtonText}>Video call</Text></Pressable>
        </View>
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
  screen: { flex: 1, backgroundColor: '#F5F7F8' },
  guestHeader: { paddingHorizontal: 24, paddingTop: 24 },
  guestEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8, color: '#73958B', marginBottom: 9 },
  guestTitle: { fontSize: 32, fontWeight: '800', color: '#172F2A', letterSpacing: -0.7 },
  guestSubtitle: { fontSize: 14, color: '#71827F', marginTop: 8, lineHeight: 21 },
  guestCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 45 },
  guestIllustration: { width: 164, height: 154, alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  guestIconHalo: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#E2F1E9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D2E8DE' },
  guestSmallIcon: { position: 'absolute', right: 4, bottom: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E1EBE6', elevation: 3 },
  guestHeading: { fontSize: 23, fontWeight: '800', color: '#19342D', textAlign: 'center', lineHeight: 30, maxWidth: 300, letterSpacing: -0.5 },
  guestDescription: { fontSize: 14, lineHeight: 23, color: '#71827F', textAlign: 'center', marginTop: 13, maxWidth: 310 },
  guestButton: { marginTop: 28, backgroundColor: green, borderRadius: 15, minHeight: 54, width: '100%', maxWidth: 310, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  guestButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  guestPrivacy: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  guestPrivacyText: { fontSize: 11, color: '#77868B' }, content: { flex: 1 }, inner: { flex: 1, padding: 18 },
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
  callNotice: { backgroundColor: '#E4F3EB', borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  callNoticeText: { color: green, fontWeight: '800' },
  callButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  accept: { backgroundColor: green, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  reject: { backgroundColor: '#C63143', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  callButtonText: { color: 'white', fontWeight: '800' },
});
