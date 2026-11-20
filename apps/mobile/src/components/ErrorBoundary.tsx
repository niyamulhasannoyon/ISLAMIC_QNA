import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureException } from '../services/sentry';
import { BengaliText } from './BengaliText';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, { componentStack: errorInfo.componentStack });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert" size={32} color="#DC2626" />
          </View>
          <BengaliText size={18} weight="700" style={styles.title}>
            একটি অনাকাঙ্ক্ষিত ত্রুটি ঘটেছে
          </BengaliText>
          <BengaliText size={14} color="#64748B" style={styles.message}>
            অ্যাপ্লিকেশনটি পুনরায় চালু করতে নিচের বোতামটি চাপুন।
          </BengaliText>
          <TouchableOpacity onPress={this.handleReset} style={styles.resetBtn}>
            <BengaliText size={14} weight="600" color="#FFFFFF">
              পুনরায় চেষ্টা করুন
            </BengaliText>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  resetBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
});
