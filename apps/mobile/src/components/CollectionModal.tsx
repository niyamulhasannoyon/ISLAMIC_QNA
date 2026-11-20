import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BengaliText } from './BengaliText';
import type { Collection } from '../types';

interface CollectionModalProps {
  visible: boolean;
  collections: Collection[];
  selectedCollectionId?: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  onCreateCollection: (name: string) => Promise<void>;
  onClose: () => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  visible,
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onClose,
}) => {
  const { colors } = useTheme();
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCollectionName.trim()) return;
    await onCreateCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsCreating(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <BengaliText size={17} weight="700">
              কালেকশনে সংরক্ষণ করুন
            </BengaliText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* None / Default unassigned option */}
          <TouchableOpacity
            style={[
              styles.itemRow,
              {
                borderBottomColor: colors.border,
                backgroundColor: !selectedCollectionId ? colors.primaryLight : 'transparent',
              },
            ]}
            onPress={() => onSelectCollection(null)}
          >
            <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
            <BengaliText size={15} weight={!selectedCollectionId ? '700' : '500'} style={styles.itemText}>
              সাধারণ বুকমার্ক (কোন কালেকশন নেই)
            </BengaliText>
            {!selectedCollectionId ? (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            ) : null}
          </TouchableOpacity>

          <FlatList
            data={collections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedCollectionId;
              return (
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                    },
                  ]}
                  onPress={() => onSelectCollection(item.id)}
                >
                  <Ionicons name="folder-outline" size={20} color={item.color || colors.primary} />
                  <BengaliText size={15} weight={isSelected ? '700' : '500'} style={styles.itemText}>
                    {item.name}
                  </BengaliText>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />

          {isCreating ? (
            <View style={styles.createBox}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="কালেকশনের নাম লিখুন..."
                placeholderTextColor={colors.textMuted}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
              />
              <View style={styles.createActions}>
                <TouchableOpacity onPress={() => setIsCreating(false)} style={styles.cancelBtn}>
                  <BengaliText size={13} color={colors.textMuted}>
                    বাতিল
                  </BengaliText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreate}
                  style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                >
                  <BengaliText size={13} weight="600" color="#FFFFFF">
                    যোগ করুন
                  </BengaliText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsCreating(true)}
              style={[styles.newCollectionBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <BengaliText size={14} weight="600" color={colors.primary}>
                নতুন কালেকশন তৈরি করুন
              </BengaliText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
  },
  newCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 16,
  },
  createBox: {
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
