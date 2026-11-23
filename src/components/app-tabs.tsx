import { useEffect, useState } from 'react';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/auth/auth-context';
import { getConversations } from '@/lib/messaging';

type TabName = 'home' | 'explore' | 'list' | 'messages' | 'account';

const items: { name: TabName; label: string; href: '/' | '/explore' | '/create-listing' | '/messages' | '/account'; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'home', label: 'Home', href: '/', icon: 'home-outline', activeIcon: 'home' },
  { name: 'explore', label: 'Explore', href: '/explore', icon: 'compass-outline', activeIcon: 'compass' },
  { name: 'list', label: 'List', href: '/create-listing', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { name: 'messages', label: 'Messages', href: '/messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  { name: 'account', label: 'Account', href: '/account', icon: 'person-outline', activeIcon: 'person' },
];

function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { iconName: keyof typeof Ionicons.glyphMap; activeIconName: keyof typeof Ionicons.glyphMap; count?: number }) {
  const { iconName, activeIconName, count = 0, ...pressableProps } = props;
  return <Pressable {...pressableProps} style={styles.tab} accessibilityLabel={String(children) + (count ? ', ' + count + ' unread messages' : '')}>
    <View style={[styles.iconBox, isFocused && styles.selected]}>
      <Ionicons name={isFocused ? activeIconName : iconName} size={24} color={isFocused ? '#116B52' : '#667780'} />
      {count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text></View>}
    </View>
    <Text style={[styles.label, isFocused && styles.activeLabel]} numberOfLines={1}>{children}</Text>
  </Pressable>;
}

export default function AppTabs() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let alive = true;
    const refresh = () => { void getConversations().then(result => { if (alive) setUnread(result.unreadCount); }).catch(() => {}); };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { alive = false; clearInterval(interval); };
  }, [user?.id]);

  return <Tabs>
    <TabSlot style={styles.slot} />
    <TabList style={styles.bar}>
      {items.map(item => <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
        <TabButton iconName={item.icon} activeIconName={item.activeIcon} count={item.name === 'messages' ? unread : 0}>{item.label}</TabButton>
      </TabTrigger>)}
    </TabList>
  </Tabs>;
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  bar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E4EBE9', paddingTop: 7, paddingBottom: 9, paddingHorizontal: 5, elevation: 12 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 55 },
  iconBox: { width: 49, height: 32, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#E1F3EB' },
  label: { fontSize: 10, fontWeight: '600', color: '#667780', marginTop: 3 },
  activeLabel: { color: '#116B52', fontWeight: '800' },
  badge: { position: 'absolute', right: -5, top: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D82F45', borderWidth: 2, borderColor: 'white' },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '800' },
});
