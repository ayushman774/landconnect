import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioSession, VideoView } from '@livekit/react-native';
import { Room, RoomEvent, type RemoteParticipant, type TrackPublication, type VideoTrack } from 'livekit-client';
import { getCallConnection, updateCall, type Call } from '@/lib/calls';

type Props = { call: Call; onClose: () => void };

export default function CallRoom({ call, onClose }: Props) {
  const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }));
  // Parent callbacks change identity on re-render; keep the latest without reconnecting.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(call.type === 'VIDEO');
  const [remoteVideo, setRemoteVideo] = useState<VideoTrack | null>(null);
  const [localVideo, setLocalVideo] = useState<VideoTrack | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);

  useEffect(() => {
    let disposed = false;
    const sync = () => {
      if (disposed) return;
      const peer = Array.from(room.remoteParticipants.values())[0];
      setPeerConnected(Boolean(peer));
      const video = peer ? Array.from(peer.videoTrackPublications.values()).find(pub => pub.track)?.track : undefined;
      setRemoteVideo((video as VideoTrack | undefined) ?? null);
      const local = Array.from(room.localParticipant.videoTrackPublications.values()).find(pub => pub.track)?.track;
      setLocalVideo((local as VideoTrack | undefined) ?? null);
    };
    const onDisconnect = () => { if (!disposed) onCloseRef.current(); };
    room.on(RoomEvent.ParticipantConnected, sync);
    room.on(RoomEvent.ParticipantDisconnected, sync);
    room.on(RoomEvent.TrackSubscribed, sync);
    room.on(RoomEvent.TrackUnsubscribed, sync);
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    room.on(RoomEvent.Disconnected, onDisconnect);
    const connect = async () => {
      try {
        if (Platform.OS === 'android') {
          const permissions = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ...(call.type === 'VIDEO' ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
          ]);
          if (Object.values(permissions).some(value => value !== PermissionsAndroid.RESULTS.GRANTED)) {
            throw new Error('Microphone and camera permissions are required for this call.');
          }
        }
        const credentials = await getCallConnection(call.id);
        if (disposed) return;
        await AudioSession.startAudioSession();
        await room.connect(credentials.url, credentials.token);
        if (disposed) return;
        await room.localParticipant.setMicrophoneEnabled(true);
        if (call.type === 'VIDEO') await room.localParticipant.setCameraEnabled(true);
        sync();
        setConnecting(false);
      } catch (caught) {
        if (!disposed) { setError(caught instanceof Error ? caught.message : 'Could not connect to call'); setConnecting(false); }
      }
    };
    void connect();
    return () => {
      disposed = true;
      room.removeAllListeners();
      void room.disconnect();
      void AudioSession.stopAudioSession();
    };
  }, [room, call.id, call.type]);

  async function end() {
    try { await updateCall(call.id, 'end'); } catch { /* Call may already be ended. */ }
    onClose();
  }

  async function toggleMute() {
    try { await room.localParticipant.setMicrophoneEnabled(muted); setMuted(!muted); }
    catch { setError('Could not change microphone state.'); }
  }

  async function toggleCamera() {
    try { await room.localParticipant.setCameraEnabled(!cameraOn); setCameraOn(!cameraOn); }
    catch { setError('Could not change camera state.'); }
  }

  return <View style={styles.screen}>
    <Text style={styles.heading}>{call.type === 'VIDEO' ? 'Video call' : 'Audio call'}</Text>
    <Text style={styles.status}>{connecting ? 'Connecting securely…' : peerConnected ? 'Connected' : 'Waiting for the other person…'}</Text>
    {!!error && <Text style={styles.error}>{error}</Text>}
    {connecting && <ActivityIndicator color="#B9F4D3" style={{ marginTop: 28 }} />}
    {call.type === 'VIDEO' && <View style={styles.videoArea}>
      {remoteVideo ? <VideoView style={styles.remoteVideo} videoTrack={remoteVideo} /> : <View style={styles.placeholder}><Text style={styles.placeholderText}>Waiting for video…</Text></View>}
      {localVideo && cameraOn && <VideoView style={styles.localVideo} videoTrack={localVideo} mirror />}
    </View>}
    <View style={styles.controls}>
      <Pressable style={styles.control} disabled={connecting} onPress={() => void toggleMute()}><Text style={styles.controlText}>{muted ? 'Unmute' : 'Mute'}</Text></Pressable>
      {call.type === 'VIDEO' && <Pressable style={styles.control} disabled={connecting} onPress={() => void toggleCamera()}><Text style={styles.controlText}>{cameraOn ? 'Camera off' : 'Camera on'}</Text></Pressable>}
      <Pressable style={[styles.control, styles.end]} onPress={() => void end()}><Text style={styles.controlText}>End call</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1920', padding: 20, justifyContent: 'space-between' },
  heading: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 25 },
  status: { color: '#B9D3C7', textAlign: 'center', marginTop: 8 },
  error: { color: '#FFB6B6', textAlign: 'center', marginTop: 12 },
  videoArea: { flex: 1, marginVertical: 24 },
  remoteVideo: { flex: 1, borderRadius: 14 },
  localVideo: { position: 'absolute', right: 12, bottom: 12, width: 110, height: 160, borderRadius: 12 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C303A', borderRadius: 14 },
  placeholderText: { color: '#D2E1E8' },
  controls: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 30 },
  control: { backgroundColor: '#31515C', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16 },
  end: { backgroundColor: '#D93646' },
  controlText: { color: '#FFFFFF', fontWeight: '800' },
});
