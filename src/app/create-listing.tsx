import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';
import { createListing, type PropertyType } from '@/lib/properties';

const green = '#146B53';
const types: PropertyType[] = ['RESIDENTIAL', 'COMMERCIAL', 'AGRICULTURAL'];

export default function CreateListingScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<PropertyType>('RESIDENTIAL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(false);

  async function submit() {
    setError('');
    const priceRupees = Number(price);
    const areaSqFt = Number(area);
    if (title.trim().length < 5 || description.trim().length < 20 || address.trim().length < 8 ||
      !Number.isSafeInteger(priceRupees) || priceRupees <= 0 || !Number.isFinite(areaSqFt) || areaSqFt <= 0) {
      setError('Enter a title (5+ characters), description (20+), address (8+), positive whole-rupee price and positive area.');
      return;
    }
    if (imageUrl.trim() && !/^https:\/\/[^\s]+$/i.test(imageUrl.trim())) {
      setError('Image URL must start with https://');
      return;
    }
    setBusy(true);
    try {
      await createListing({
        title: title.trim(), description: description.trim(), address: address.trim(),
        priceRupees, areaSqFt, type, imageUrls: imageUrl.trim() ? [imageUrl.trim()] : [],
        publish: published,
      });
      setTitle(''); setDescription(''); setAddress(''); setPrice(''); setArea(''); setImageUrl('');
      Alert.alert('Listing saved', published ? 'Your property is now visible in the marketplace.' : 'Your draft was saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save listing.');
    } finally { setBusy(false); }
  }

  if (!user || user.role === 'BUYER') return <SafeAreaView style={styles.screen}><View style={styles.content}><Text style={styles.heading}>List your land</Text><Text style={styles.muted}>Sign in with a seller or broker account to create property listings.</Text></View></SafeAreaView>;

  return <SafeAreaView style={styles.screen} edges={['top']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>List your land</Text>
      <Text style={styles.muted}>Create a property listing for buyers to discover.</Text>
      <Text style={styles.label}>PROPERTY TYPE</Text>
      <View style={styles.types}>{types.map(item => <Pressable key={item} onPress={() => setType(item)} style={[styles.chip, type === item && styles.activeChip]}><Text style={[styles.chipText, type === item && styles.activeText]}>{item}</Text></Pressable>)}</View>
      <Text style={styles.label}>TITLE</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Roadside residential plot" />
      <Text style={styles.label}>DESCRIPTION</Text><TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholder="Describe access, nearby facilities and land features" textAlignVertical="top" />
      <Text style={styles.label}>ADDRESS</Text><TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Area, city and state" />
      <Text style={styles.label}>PRICE (₹)</Text><TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="2500000" />
      <Text style={styles.label}>AREA (SQ FT)</Text><TextInput style={styles.input} value={area} onChangeText={setArea} keyboardType="decimal-pad" placeholder="12000" />
      <Text style={styles.label}>IMAGE URL (OPTIONAL)</Text><TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://..." />
      <Text style={styles.muted}>Direct HTTPS image URLs are supported for now. Camera and gallery upload will be added separately.</Text>
      <Pressable style={styles.toggle} onPress={() => setPublished(!published)} accessibilityRole="checkbox" accessibilityState={{ checked: published }}><Text style={styles.toggleText}>{published ? '☑ Publish immediately' : '☐ Save as draft'}</Text></Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable disabled={busy} style={[styles.button, busy && { opacity: 0.6 }]} onPress={() => void submit()}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save property</Text>}</Pressable>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F8' }, content: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 27, fontWeight: '800', color: green, marginBottom: 8 },
  muted: { color: '#64747C', fontSize: 13, lineHeight: 20, marginTop: 6 },
  label: { color: '#52616A', fontWeight: '700', fontSize: 12, marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#DDE6E9', borderRadius: 12, paddingHorizontal: 14, minHeight: 50, color: '#17242A' },
  multiline: { minHeight: 100, paddingTop: 12 },
  types: { flexDirection: 'row', gap: 5 }, chip: { flex: 1, borderWidth: 1, borderColor: '#DDE6E9', backgroundColor: 'white', paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeChip: { backgroundColor: green }, chipText: { fontSize: 10, fontWeight: '800', color: '#52616A' }, activeText: { color: 'white' },
  toggle: { paddingVertical: 18 }, toggleText: { color: green, fontWeight: '700' },
  error: { color: '#B3261E', marginBottom: 12 }, button: { backgroundColor: green, minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontWeight: '800', fontSize: 16 },
});
