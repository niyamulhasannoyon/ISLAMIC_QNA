import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useHaptics } from '../../src/hooks/useHaptics';
import { BengaliText } from '../../src/components/BengaliText';
import { executeReportIssue } from '../../src/services/api';
import type { ReportIssuePayload } from '../../src/types';

type IssueCategory = ReportIssuePayload['issueType'];

interface IssueCategoryOption {
  key: IssueCategory;
  labelBn: string;
  labelEn: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ISSUE_CATEGORIES: IssueCategoryOption[] = [
  { key: 'typo', labelBn: 'বানান বা মুদ্রণ ত্রুটি', labelEn: 'Typo / Spelling Error', icon: 'create-outline' },
  { key: 'factual_error', labelBn: 'তথ্যগত ভুল বা বিভ্রান্তি', labelEn: 'Factual Inaccuracy', icon: 'alert-circle-outline' },
  { key: 'broken_link', labelBn: 'মূল লিঙ্ক কাজ করছে না', labelEn: 'Broken Source Link', icon: 'link-outline' },
  { key: 'wrong_category', labelBn: 'ভুল বিষয়শ্রেণী নির্ধারণ', labelEn: 'Incorrect Category', icon: 'folder-outline' },
  { key: 'scholarly_dispute', labelBn: 'উদ্ধৃতি বা দলীল সংক্রান্ত মতভেদ', labelEn: 'Scholarly Dispute / Evidence', icon: 'book-outline' },
  { key: 'other', labelBn: 'অন্যান্য সমস্যা', labelEn: 'Other Issue', icon: 'help-circle-outline' },
];

export default function ReportFatwaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { light, heavy } = useHaptics();

  const [reason, setReason] = useState<IssueCategory>('typo');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isBn = settings.language === 'bn';

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(
        isBn ? 'বর্ণনা প্রয়োজন' : 'Description Required',
        isBn ? 'দয়া করে সমস্যার বিস্তারিত বিবরণ লিখুন।' : 'Please describe the issue in detail.'
      );
      return;
    }

    setIsSubmitting(true);
    heavy();

    const payload: ReportIssuePayload = {
      fatwaId: id || 'unknown',
      issueType: reason,
      description: description.trim(),
      reporterEmail: email.trim() || undefined,
    };

    const res = await executeReportIssue(payload);
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
    } else {
      Alert.alert(
        isBn ? 'ব্যর্থ হয়েছে' : 'Submission Failed',
        res.error || (isBn ? 'প্রতিবেদন পাঠানো সম্ভব হয়নি, পরে আবার চেষ্টা করুন।' : 'Failed to submit report. Please try again.')
      );
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          </View>
          <BengaliText size={20} weight="700" style={styles.successTitle}>
            {isBn ? 'প্রতিবেদন গৃহীত হয়েছে' : 'Report Received'}
          </BengaliText>
          <BengaliText size={15} color={colors.textSecondary} style={styles.successMsg}>
            {isBn
              ? 'আপনার মূল্যবান মতামতের জন্য জাযাকুমুল্লাহু খাইরান। আমাদের নিরীক্ষক দল দ্রুত এটি পর্যালোচনা করবেন।'
              : 'Thank you for helping us maintain accuracy. Our team will review this shortly.'}
          </BengaliText>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>{isBn ? 'ফিরে যান' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BengaliText size={16} weight="600" style={styles.heading}>
          {isBn ? 'সমস্যার ধরণ নির্বাচন করুন:' : 'Select Issue Type:'}
        </BengaliText>

        {/* Categories selector */}
        <View style={styles.categoryGrid}>
          {ISSUE_CATEGORIES.map((item) => {
            const isSelected = reason === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.categoryOption,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  light();
                  setReason(item.key);
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={isSelected ? colors.primaryDark : colors.textMuted}
                />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected ? colors.primaryDark : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {isBn ? item.labelBn : item.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description textarea */}
        <BengaliText size={16} weight="600" style={[styles.heading, { marginTop: 20 }]}>
          {isBn ? 'বিস্তারিত বিবরণ লিখুন *' : 'Description of the Issue *'}
        </BengaliText>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          placeholder={
            isBn
              ? 'এখানে ভুল অংশ বা সঠিক তথ্য সম্পর্কে লিখুন...'
              : 'Please describe the discrepancy or error...'
          }
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />

        {/* Email input (optional) */}
        <BengaliText size={15} weight="600" style={[styles.heading, { marginTop: 16 }]}>
          {isBn ? 'আপনার ইমেইল (ঐচ্ছিক)' : 'Contact Email (Optional)'}
        </BengaliText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={isBn ? 'আপডেট পাওয়ার জন্য (ঐচ্ছিক)' : 'name@example.com'}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              opacity: isSubmitting || !description.trim() ? 0.6 : 1,
            },
          ]}
          disabled={isSubmitting || !description.trim()}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isBn ? 'প্রতিবেদন জমা দিন' : 'Submit Report'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    marginBottom: 10,
  },
  categoryGrid: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  categoryText: {
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    height: 48,
  },
  submitBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    marginBottom: 10,
  },
  successMsg: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
