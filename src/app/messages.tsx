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
      {active ? (
        <View style={styles.chatHeader}>
          <Pressable style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to conversations" onPress={() => { setActive(null); void loadConversations(); }}>
            <Ionicons name="chevron-back" size={25} color="#243A34" />
          </Pressable>
          <View style={styles.headerAvatar}><Text style={styles.headerAvatarText}>{(active.participants.find(p => p.userId !== user.id)?.user.name ?? 'C').slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.headerDetails}>
            <Text style={styles.chatName} numberOfLines={1}>{active.participants.find(p => p.userId !== user.id)?.user.name ?? 'Conversation'}</Text>
            <Text style={styles.chatSubheading}>Property conversation</Text>
          </View>
          <Pressable style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Refresh messages" onPress={() => void loadMessages(active.id)}>
            <Ionicons name="refresh-outline" size={21} color={green} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.inboxHeader}>
          <View style={styles.inboxHeading}>
            <Text style={styles.inboxEyebrow}>YOUR INBOX</Text>
            <Text style={styles.inboxTitle}>Messages</Text>
            <Text style={styles.inboxSubtitle}>Stay connected with your property contacts</Text>
          </View>
          <Pressable style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Refresh conversations" onPress={() => void loadConversations()}>
            <Ionicons name="refresh-outline" size={21} color={green} />
          </Pressable>
        </View>
      )}
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
        <FlatList style={styles.list} data={messages} keyExtractor={item => item.id}
          contentContainerStyle={styles.messageListContent}
          renderItem={({ item }) => {
            const own = item.senderId === user.id;
            return <View style={[styles.bubble, own ? styles.own : styles.theirs]}>
              <Text style={[styles.body, own && styles.ownText]}>{item.body}</Text>
              <View style={styles.bubbleFooter}>
                <Text style={[styles.time, own && styles.ownTime]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                {own && <Ionicons name="checkmark-done" size={13} color="#C9E6DC" />}
              </View>
            </View>;
          }}
          ListEmptyComponent={<View style={styles.emptyChat}><Ionicons name="chatbubble-ellipses-outline" size={36} color="#A1B5AD" /><Text style={styles.emptyChatTitle}>Start the conversation</Text><Text style={styles.muted}>Send a message to get things going.</Text></View>} />
        <View style={styles.chatBottom}>
          <View style={styles.callToolbar}>
            <Pressable style={[styles.callAction, (busy || !!outgoing) && styles.disabledAction]} accessibilityRole="button" accessibilityLabel="Start audio call" disabled={busy || !!outgoing} onPress={() => void initiateCall('AUDIO')}>
              <Ionicons name="call-outline" size={20} color={green} /><Text style={styles.callActionText}>Audio call</Text>
            </Pressable>
            <Pressable style={[styles.callAction, (busy || !!outgoing) && styles.disabledAction]} accessibilityRole="button" accessibilityLabel="Start video call" disabled={busy || !!outgoing} onPress={() => void initiateCall('VIDEO')}>
              <Ionicons name="videocam-outline" size={21} color={green} /><Text style={styles.callActionText}>Video call</Text>
            </Pressable>
          </View>
          <View style={styles.composer}>
            <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Write a message..." placeholderTextColor="#94A39D" multiline maxLength={2000} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={busy || !draft.trim()} onPress={() => void submit()} style={[styles.send, (busy || !draft.trim()) && styles.sendDisabled]}>{busy ? <ActivityIndicator color="white" /> : <Ionicons name="arrow-up" size={23} color="#FFFFFF" />}</Pressable>
          </View>
        </View>
      </> : <FlatList style={styles.list} contentContainerStyle={styles.conversationListContent} data={conversations} keyExtractor={item => item.id} onRefresh={() => void loadConversations()} refreshing={false}
        renderItem={({ item }) => {
          const peer = item.participants.find(p => p.userId !== user.id)?.user;
          return <Pressable style={styles.row} onPress={() => setActive(item)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{peer?.name?.slice(0, 1).toUpperCase() ?? '?'}</Text></View>
            <View style={styles.conversationInfo}>
              <Text style={styles.peer} numberOfLines={1}>{peer?.name ?? 'Conversation'}</Text>
              <Text style={styles.conversationPreview} numberOfLines={2}>{item.messages[0]?.body ?? 'Start chatting'}</Text>
            </View>
            <View style={styles.conversationTrailing}>
              {!!item.unreadCount && <View style={styles.badge}><Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View>}
              <Ionicons name="chevron-forward" size={18} color="#96A9A0" />
            </View>
          </Pressable>;
        }} ListEmptyComponent={<View style={styles.emptyInbox}><Ionicons name="chatbubbles-outline" size={36} color="#8BA99A" /><Text style={styles.emptyChatTitle}>No conversations yet</Text><Text style={styles.emptyInboxDescription}>Open a property listing and contact its seller to start chatting.</Text></View>} />}
    </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F8' },
  inboxHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 125, paddingTop: 5, paddingBottom: 18, gap: 12 },
  inboxHeading: { flex: 1, justifyContent: 'center' },
  inboxEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.7, color: '#77988B', marginBottom: 6 },
  inboxTitle: { fontSize: 29, lineHeight: 36, fontWeight: '800', color: '#193B30', letterSpacing: -0.6, includeFontPadding: true },
  inboxSubtitle: { fontSize: 12, color: '#7D8E87', marginTop: 5, lineHeight: 17 },
  conversationListContent: { paddingTop: 4, paddingBottom: 22, flexGrow: 1 },
  conversationInfo: { flex: 1, justifyContent: 'center', gap: 5 },
  conversationPreview: { fontSize: 12, color: '#788B82', lineHeight: 18 },
  conversationTrailing: { alignItems: 'center', justifyContent: 'center', gap: 9, minWidth: 22 },
  emptyInbox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingBottom: 65 },
  emptyInboxDescription: { fontSize: 13, color: '#7D8E87', lineHeight: 21, textAlign: 'center', marginTop: 9 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: -18, marginTop: -18, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8EEEB', gap: 10 },
  backButton: { width: 32, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#DCEFE6', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 18, fontWeight: '800', color: green },
  headerDetails: { flex: 1, justifyContent: 'center' },
  chatName: { fontSize: 17, fontWeight: '800', color: '#203A31' },
  chatSubheading: { fontSize: 11, color: '#81948A', marginTop: 3 },
  headerAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EFF6F2', alignItems: 'center', justifyContent: 'center' },
  messageListContent: { paddingTop: 22, paddingBottom: 16, flexGrow: 1 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 7 },
  ownTime: { color: '#C9E6DC' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyChatTitle: { fontSize: 17, fontWeight: '800', color: '#29483C', marginTop: 12 },
  chatBottom: { backgroundColor: '#FFFFFF', marginHorizontal: -18, marginBottom: -18, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#E8EEEB' },
  callToolbar: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 },
  callAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 17, height: 40, borderRadius: 20, backgroundColor: '#EAF5EF' },
  callActionText: { color: green, fontSize: 13, fontWeight: '800' },
  disabledAction: { opacity: 0.45 },
  sendDisabled: { opacity: 0.5 },
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
  row: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 17, borderRadius: 18, marginBottom: 11, borderWidth: 1, borderColor: '#EDF1EE' },
  avatar: { width: 49, height: 49, borderRadius: 25, backgroundColor: '#DDF0E8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: green, fontWeight: '800' }, peer: { fontSize: 16, color: '#17242A', fontWeight: '700' }, arrow: { color: green, fontSize: 24 },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, marginBottom: 12, elevation: 1 },
  own: { backgroundColor: green, alignSelf: 'flex-end', borderBottomRightRadius: 5 }, theirs: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  body: { fontSize: 14, lineHeight: 21, color: '#17242A' }, ownText: { color: 'white' }, time: { fontSize: 10, color: '#87968F' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, backgroundColor: '#F4F7F5', borderRadius: 22, paddingHorizontal: 17, paddingVertical: 11, maxHeight: 110, minHeight: 46, color: '#17242A', fontSize: 14, borderWidth: 1, borderColor: '#E7EEEA' },
  send: { backgroundColor: green, borderRadius: 23, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
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
