import { useState } from 'react';
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
      <View style={styles.content}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.heading}>Welcome, {user.name}</Text>
        <View style={styles.panel}>
          <Text style={styles.label}>ACCOUNT TYPE</Text><Text style={styles.value}>{user.role}</Text>
          <Text style={styles.label}>EMAIL</Text><Text style={styles.value}>{user.email}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => { Alert.alert('Sign out', 'Sign out of LandConnect?', [{ text: 'Cancel' }, { text: 'Sign out', onPress: () => { void signOut().catch(() => Alert.alert('Error', 'Unable to sign out. Please try again.')); } }]); }}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
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
