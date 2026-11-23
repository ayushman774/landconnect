import { useEffect, useState } from 'react';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/auth/auth-context';
import { getConversations } from '@/lib/messaging';

type TabName = 'home' | 'explore' | 'list' | 'messages' | 'account';

const items: { name: TabName; label: string; href: '/' | '/explore' | '/create-listing' | '/messages' | '/account'; icon: string }[] = [
  { name: 'home', label: 'Home', href: '/', icon: 'home-svg' },
  { name: 'explore', label: 'Explore', href: '/explore', icon: '◎' },
  { name: 'list', label: 'List', href: '/create-listing', icon: '⊞' },
  { name: 'messages', label: 'Messages', href: '/messages', icon: '▤' },
  { name: 'account', label: 'Account', href: '/account', icon: '♙' },
];

function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { iconName: string; count?: number }) {
  const { iconName, count = 0, ...pressableProps } = props;
  return <Pressable {...pressableProps} style={styles.tab} accessibilityLabel={String(children) + (count ? ', ' + count + ' unread messages' : '')}>
    <View style={[styles.iconBox, isFocused && styles.selected]}>
      {iconName === 'home-svg' ? (
        <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityElementsHidden>
          <Path
            d="M 12 2.0996094 L 1 12 L 4 12 L 4 21 L 11 21 L 11 15 L 13 15 L 13 21 L 20 21 L 20 12 L 23 12 L 12 2.0996094 z M 12 4.7910156 L 18 10.191406 L 18 11 L 18 19 L 15 19 L 15 13 L 9 13 L 9 19 L 6 19 L 6 10.191406 L 12 4.7910156 z"
            fill={isFocused ? '#116B52' : '#667780'}
          />
        </Svg>
      ) : (
        <Text style={[styles.iconText, isFocused && styles.activeIcon]}>{iconName}</Text>
      )}
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
        <TabButton iconName={item.icon} count={item.name === 'messages' ? unread : 0}>{item.label}</TabButton>
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
  iconText: { fontSize: 26, lineHeight: 30, fontWeight: '700', color: '#667780', textAlign: 'center', includeFontPadding: false },
  activeIcon: { color: '#116B52' },
});
