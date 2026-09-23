import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Contact } from '@/types/sms';

export type ContactPickerProps = {
  contacts: readonly Contact[];
  selectedContactId?: string | null;
  onSelect: (contact: Contact) => void;
  style?: StyleProp<ViewStyle>;
  emptyLabel?: string;
};

export function ContactPicker({
  contacts,
  selectedContactId,
  onSelect,
  style,
  emptyLabel = 'Aucun contact disponible.',
}: ContactPickerProps) {
  const theme = useTheme();

  if (contacts.length === 0) {
    return (
      <View style={style}>
        <Text style={[styles.emptyLabel, { color: theme.textSecondary }]}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      accessibilityLabel="Liste des contacts"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={style}>
      {contacts.map((contact) => {
        const selected = contact.id === selectedContactId;

        return (
          <Pressable
            accessibilityLabel={`Choisir ${contact.displayName}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={contact.id}
            onPress={() => onSelect(contact)}
            style={({ pressed }) => [
              styles.contact,
              { borderBottomColor: theme.backgroundElement },
              selected && { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
              <Text style={styles.avatarText}>{contact.initials}</Text>
            </View>
            <View style={styles.details}>
              <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
                {contact.displayName}
              </Text>
              <Text numberOfLines={1} style={[styles.phoneNumber, { color: theme.textSecondary }]}>
                {contact.phoneNumber}
              </Text>
            </View>
            {selected ? <Text style={[styles.selectedMark, { color: theme.text }]}>✓</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 4,
  },
  contact: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.72,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  details: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  phoneNumber: {
    fontSize: 14,
  },
  selectedMark: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyLabel: {
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
});
