import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';
import { type Role } from '@/lib/api';

const green = '#146B53';
const roles: Role[] = ['BUYER', 'SELLER', 'BROKER'];

export default function AccountScreen() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!email.trim() || !password || (mode === 'register' && (!name.trim() || password.length < 10))) {
      setError('Enter the required fields. Registration passwords need at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await signIn(email.trim(), password);
      else await signUp({ name: name.trim(), email: email.trim(), password, role });
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={green} size="large" /></SafeAreaView>;

  if (user) return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.profileContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeading}>
          <Text style={styles.profileEyebrow}>MY PROFILE</Text>
          <Text style={styles.profileTitle}>Account</Text>
          <Text style={styles.profileSubtitle}>Your LandConnect profile and account details</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{user.name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || '?'}</Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <View style={styles.rolePill}>
            <Ionicons name="checkmark-circle" size={15} color={green} />
            <Text style={styles.rolePillText}>{user.role.charAt(0) + user.role.slice(1).toLowerCase()} account</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="person-outline" size={20} color={green} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Full name</Text>
              <Text style={styles.infoValue}>{user.name}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="mail-outline" size={20} color={green} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Email address</Text>
              <Text style={styles.infoValue} selectable>{user.email}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="shield-checkmark-outline" size={20} color={green} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Account type</Text>
              <Text style={styles.infoValue}>{user.role}</Text>
            </View>
          </View>
        </View>

        <Pressable accessibilityRole="button" style={styles.profileSignOut} onPress={() => { Alert.alert('Sign out', 'Sign out of LandConnect?', [{ text: 'Cancel' }, { text: 'Sign out', onPress: () => { void signOut().catch(() => Alert.alert('Error', 'Unable to sign out. Please try again.')); } }]); }}>
          <Ionicons name="log-out-outline" size={21} color="#C44E4E" />
          <Text style={styles.profileSignOutText}>Sign out</Text>
          <Ionicons name="chevron-forward" size={18} color="#C6A5A5" />
        </Pressable>
        <Text style={styles.profileFooter}>LandConnect · Your property journey starts here</Text>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>LANDCONNECT</Text>
          <Text style={styles.heading}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={styles.subtitle}>{mode === 'login' ? 'Sign in to connect with land buyers and sellers.' : 'Join the land marketplace in minutes.'}</Text>
          {mode === 'register' && <>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} autoComplete="name" />
            <Text style={styles.label}>I AM A</Text>
            <View style={styles.roles}>{roles.map(item => <Pressable key={item} style={[styles.role, role === item && styles.selectedRole]} onPress={() => setRole(item)}><Text style={[styles.roleText, role === item && styles.selectedRoleText]}>{item}</Text></Pressable>)}</View>
          </>}
          <Text style={styles.label}>EMAIL</Text>
          <TextInput style={styles.input} placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput style={styles.input} placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <Pressable disabled={busy} style={[styles.button, busy && styles.disabled]} onPress={() => { void submit(); }}>
            {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>}
          </Pressable>
          <Pressable style={styles.switchButton} onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            <Text style={styles.switchText}>{mode === 'login' ? 'New to LandConnect? Create an account' : 'Already registered? Sign in'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileContent: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 50 },
  profileHeading: { marginBottom: 24 },
  profileEyebrow: { color: '#6B9484', fontSize: 11, fontWeight: '800', letterSpacing: 1.7, marginBottom: 8 },
  profileTitle: { fontSize: 31, fontWeight: '800', color: '#19372E', letterSpacing: -0.6 },
  profileSubtitle: { color: '#7D8C85', fontSize: 13, lineHeight: 20, marginTop: 6 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingVertical: 27, paddingHorizontal: 18, alignItems: 'center', borderWidth: 1, borderColor: '#EDF1EE' },
  profileAvatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#DDEFE5', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  profileInitials: { color: '#146B53', fontSize: 26, fontWeight: '800' },
  profileName: { color: '#1C3029', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 29 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EAF6EF', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, marginTop: 11 },
  rolePillText: { fontSize: 12, color: '#146B53', fontWeight: '800' },
  sectionTitle: { color: '#203A31', fontSize: 16, fontWeight: '800', marginTop: 27, marginBottom: 13 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 19, paddingHorizontal: 17, paddingVertical: 5, borderWidth: 1, borderColor: '#EDF1EE' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 16 },
  infoIcon: { width: 41, height: 41, borderRadius: 13, backgroundColor: '#EDF6F1', alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#84938B', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#24372F' },
  infoDivider: { height: 1, backgroundColor: '#EFF2F0', marginLeft: 54 },
  profileSignOut: { marginTop: 24, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1E4E4', paddingHorizontal: 18, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileSignOutText: { flex: 1, fontSize: 14, fontWeight: '800', color: '#B64B4B' },
  profileFooter: { textAlign: 'center', marginTop: 26, color: '#9AA8A0', fontSize: 11 },
  flex: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F8' },
  screen: { flex: 1, backgroundColor: '#F5F7F8' }, content: { padding: 24, paddingTop: 40, paddingBottom: 60 },
  eyebrow: { color: green, fontWeight: '800', fontSize: 12, letterSpacing: 2, marginBottom: 12 },
  heading: { fontSize: 30, fontWeight: '800', color: '#17242A' }, subtitle: { color: '#65747D', marginTop: 10, marginBottom: 28, lineHeight: 21 },
  label: { color: '#53636C', fontSize: 12, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DBE4E7', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, height: 52, color: '#17242A' },
  roles: { flexDirection: 'row', gap: 8 }, role: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#DBE4E7', borderRadius: 12, backgroundColor: '#fff', alignItems: 'center' },
  selectedRole: { backgroundColor: green, borderColor: green }, roleText: { fontSize: 11, color: '#53636C', fontWeight: '800' }, selectedRoleText: { color: 'white' },
  error: { color: '#B3261E', marginTop: 16 }, button: { marginTop: 26, backgroundColor: green, minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  switchButton: { marginTop: 24, alignItems: 'center' }, switchText: { color: green, fontWeight: '700' },
  panel: { marginTop: 25, padding: 20, borderRadius: 16, backgroundColor: 'white' }, value: { color: '#17242A', fontSize: 17, fontWeight: '700' },
});
