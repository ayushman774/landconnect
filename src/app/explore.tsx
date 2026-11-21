import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const steps = [
  { title: 'Browse land', body: 'Search by location and compare residential, commercial and agricultural plots.' },
  { title: 'Connect securely', body: 'Upcoming: verified profiles, in-app messaging and meeting rooms.' },
  { title: 'Talk face to face', body: 'Upcoming: in-app audio and video calls without exposing phone numbers.' },
];
export default function ExploreScreen() {
  return <SafeAreaView style={styles.screen} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Explore LandConnect</Text>
    <Text style={styles.subtitle}>A simpler way to discover land and connect with people.</Text>
    {steps.map((step, index) => <View key={step.title} style={styles.card}><Text style={styles.number}>0{index + 1}</Text><Text style={styles.title}>{step.title}</Text><Text style={styles.body}>{step.body}</Text></View>)}
    <Text style={styles.note}>Marketplace records are currently demonstration data. Accounts, chat and calling require backend integration.</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F8' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 27, fontWeight: '800', color: '#146B53', marginBottom: 8 },
  subtitle: { color: '#64747C', lineHeight: 21, marginBottom: 22 },
  card: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E4E9EB', borderRadius: 16, padding: 19, marginBottom: 13 },
  number: { color: '#146B53', fontWeight: '800', marginBottom: 8 },
  title: { color: '#17242A', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  body: { color: '#64747C', lineHeight: 21 },
  note: { color: '#78858B', fontSize: 12, lineHeight: 19, marginTop: 12 },
});
