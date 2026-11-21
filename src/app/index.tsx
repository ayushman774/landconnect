import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categories, sampleProperties, type LandCategory, type Property } from '@/constants/properties';

const green = '#146B53';
function PropertyCard({ property }: { property: Property }) {
  return (
    <View style={styles.card}>
      <View style={styles.photo}><Text style={styles.photoText}>Photos available when listings are connected</Text></View>
      <View style={styles.cardBody}>
        <Text style={styles.categoryLabel}>{property.category}</Text>
        <Text style={styles.propertyTitle}>{property.title}</Text>
        <Text style={styles.muted}>{property.location}</Text>
        <View style={styles.priceRow}><Text style={styles.price}>{property.price}</Text><Text style={styles.muted}>{property.area}</Text></View>
      </View>
    </View>
  );
}
export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LandCategory>('All');
  const properties = useMemo(() => sampleProperties.filter(p =>
    (category === 'All' || p.category === category) &&
    (p.title + ' ' + p.location).toLowerCase().includes(search.trim().toLowerCase())
  ), [category, search]);
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={properties}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <PropertyCard property={item} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<>
          <View style={styles.header}><View><Text style={styles.brand}>LandConnect</Text><Text style={styles.muted}>Find land. Build your future.</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>LC</Text></View></View>
          <View style={styles.hero}><Text style={styles.eyebrow}>LAND MARKETPLACE</Text><Text style={styles.heroTitle}>Discover your next opportunity.</Text><Text style={styles.heroBody}>Explore plots and connect with buyers, sellers and brokers.</Text></View>
          <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search properties or locations" placeholderTextColor="#88939A" accessibilityLabel="Search properties" />
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={categories} keyExtractor={item => item} contentContainerStyle={styles.filters} renderItem={({ item }) =>
            <Pressable onPress={() => setCategory(item)} accessibilityRole="button" accessibilityState={{ selected: category === item }} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>
          } />
          <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Explore properties</Text><Text style={styles.muted}>{properties.length} results</Text></View>
        </>}
        ListEmptyComponent={<Text style={styles.empty}>No matching properties. Try another search.</Text>}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F8' },
  content: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brand: { color: green, fontSize: 25, fontWeight: '800' },
  muted: { color: '#65747D', fontSize: 12, marginTop: 5 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DDF0E8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: green, fontWeight: '800' },
  hero: { backgroundColor: green, borderRadius: 20, padding: 23, marginBottom: 18 },
  eyebrow: { color: '#C1E9D8', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  heroTitle: { color: 'white', fontSize: 28, lineHeight: 35, fontWeight: '800' },
  heroBody: { color: '#E0F3E9', marginTop: 10, lineHeight: 21 },
  input: { backgroundColor: 'white', borderColor: '#E0E6E8', borderWidth: 1, borderRadius: 13, height: 52, paddingHorizontal: 15, color: '#17242A' },
  filters: { gap: 8, paddingVertical: 19 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'white', borderColor: '#E0E6E8', borderWidth: 1, borderRadius: 22 },
  chipActive: { backgroundColor: green, borderColor: green },
  chipText: { color: '#52616A', fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: 'white' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#17242A', fontSize: 20, fontWeight: '800' },
  card: { backgroundColor: 'white', borderRadius: 17, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#E7ECEE' },
  photo: { height: 145, backgroundColor: '#DBE9E2', alignItems: 'center', justifyContent: 'center' },
  photoText: { color: '#648375', fontSize: 12 },
  cardBody: { padding: 16 },
  categoryLabel: { color: green, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  propertyTitle: { color: '#17242A', fontSize: 17, fontWeight: '800' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  price: { color: green, fontSize: 20, fontWeight: '800' },
  empty: { color: '#65747D', textAlign: 'center', marginTop: 28 },
});
