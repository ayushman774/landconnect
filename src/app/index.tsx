import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { browseProperties, formatPrice, type Listing, type PropertyType } from '@/lib/properties';

const green = '#146B53';
const categories: { label: string; value?: PropertyType }[] = [
  { label: 'All' }, { label: 'Residential', value: 'RESIDENTIAL' },
  { label: 'Commercial', value: 'COMMERCIAL' }, { label: 'Agricultural', value: 'AGRICULTURAL' },
];

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PropertyType | undefined>();
  const [properties, setProperties] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (query: string, type?: PropertyType, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await browseProperties(query, type);
      setProperties(result.properties);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load properties.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(search, category); }, 350);
    return () => clearTimeout(timer);
  }, [search, category, load]);

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <FlatList
      data={properties}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(search, category, true)} />}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        <View style={styles.header}><View><Text style={styles.brand}>LandConnect</Text><Text style={styles.muted}>Find land. Build your future.</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>LC</Text></View></View>
        <View style={styles.hero}><Text style={styles.eyebrow}>LAND MARKETPLACE</Text><Text style={styles.heroTitle}>Discover your next opportunity.</Text><Text style={styles.heroBody}>Explore real listings from land sellers and brokers.</Text></View>
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search properties or locations" placeholderTextColor="#88939A" accessibilityLabel="Search properties" />
        <View style={styles.filters}>{categories.map(item => <Pressable key={item.label} onPress={() => setCategory(item.value)} style={[styles.chip, category === item.value && styles.chipActive]}><Text style={[styles.chipText, category === item.value && styles.chipTextActive]}>{item.label}</Text></Pressable>)}</View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Explore properties</Text><Text style={styles.muted}>{properties.length} results</Text></View>
        {!!error && <Pressable onPress={() => void load(search, category)}><Text style={styles.error}>{error} · Tap to retry</Text></Pressable>}
      </>}
      renderItem={({ item }) => <View style={styles.card}>
        {item.images[0]?.url ? <Image source={{ uri: item.images[0].url }} style={styles.photo} resizeMode="cover" /> : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.photoText}>No photo uploaded</Text></View>}
        <View style={styles.cardBody}>
          <Text style={styles.categoryLabel}>{item.type}</Text>
          <Text style={styles.propertyTitle}>{item.title}</Text>
          <Text style={styles.muted}>{item.address}</Text>
          <Text style={styles.muted}>Listed by {item.owner.name} · {item.owner.role}</Text>
          <View style={styles.priceRow}><Text style={styles.price}>{formatPrice(item.priceRupees)}</Text><Text style={styles.muted}>{item.areaSqFt.toLocaleString('en-IN')} sq ft</Text></View>
          <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
        </View>
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color={green} style={{ marginTop: 30 }} /> : !error ? <Text style={styles.empty}>No published properties yet. Sellers can add a listing from the List tab.</Text> : undefined}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F8' }, content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brand: { color: green, fontSize: 25, fontWeight: '800' }, muted: { color: '#65747D', fontSize: 12, marginTop: 5 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DDF0E8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: green, fontWeight: '800' },
  hero: { backgroundColor: green, borderRadius: 20, padding: 23, marginBottom: 18 },
  eyebrow: { color: '#C1E9D8', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  heroTitle: { color: 'white', fontSize: 28, lineHeight: 35, fontWeight: '800' },
  heroBody: { color: '#E0F3E9', marginTop: 10, lineHeight: 21 },
  input: { backgroundColor: 'white', borderColor: '#E0E6E8', borderWidth: 1, borderRadius: 13, height: 52, paddingHorizontal: 15, color: '#17242A' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingVertical: 19 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white', borderColor: '#E0E6E8', borderWidth: 1, borderRadius: 22 },
  chipActive: { backgroundColor: green, borderColor: green }, chipText: { color: '#52616A', fontWeight: '600', fontSize: 12 }, chipTextActive: { color: 'white' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#17242A', fontSize: 20, fontWeight: '800' },
  card: { backgroundColor: 'white', borderRadius: 17, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#E7ECEE' },
  photo: { height: 165, width: '100%' }, photoEmpty: { backgroundColor: '#DBE9E2', alignItems: 'center', justifyContent: 'center' },
  photoText: { color: '#648375', fontSize: 12 }, cardBody: { padding: 16 },
  categoryLabel: { color: green, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  propertyTitle: { color: '#17242A', fontSize: 17, fontWeight: '800' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  price: { color: green, fontSize: 20, fontWeight: '800' },
  description: { color: '#52616A', marginTop: 12, lineHeight: 19, fontSize: 13 },
  empty: { color: '#65747D', textAlign: 'center', marginTop: 28, lineHeight: 22 }, error: { color: '#B3261E', marginBottom: 15 },
});
