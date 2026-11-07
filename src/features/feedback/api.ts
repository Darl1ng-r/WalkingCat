import { Platform } from 'react-native';

import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

export type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other';

export const FEEDBACK_CATEGORIES: readonly {
  key: FeedbackCategory;
  emoji: string;
  label: string;
  description: string;
}[] = [
  {
    key: 'bug',
    emoji: '🐛',
    label: 'Bug Report',
    description: 'Something didn’t work as expected or crashed.',
  },
  {
    key: 'idea',
    emoji: '💡',
    label: 'Feature Idea',
    description: 'Suggestions to make walking or cat collecting better.',
  },
  {
    key: 'praise',
    emoji: '🐾',
    label: 'Praise & Cats',
    description: 'What you loved about your recent strolls.',
  },
  {
    key: 'other',
    emoji: '💬',
    label: 'General Feedback',
    description: 'Any other question, thought, or comment.',
  },
] as const;

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  message: string;
  appVersion?: string;
  platform?: string;
}

export function validateFeedbackMessage(raw: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = raw.trim();
  if (trimmed.length < 5) {
    return {
      valid: false,
      error: 'Please enter at least 5 characters.',
    };
  }
  if (trimmed.length > 2000) {
    return {
      valid: false,
      error: 'Feedback message cannot exceed 2,000 characters.',
    };
  }
  return { valid: true };
}

export async function submitUserFeedback(
  input: SubmitFeedbackInput
): Promise<void> {
  const check = validateFeedbackMessage(input.message);
  if (!check.valid) {
    throw new Error(check.error);
  }

  if (!isSupabaseConfigured) {
    logger.info('[Feedback] Submitted offline demo feedback', {
      category: input.category,
      messageLength: input.message.length,
    });
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('feedback').insert({
    user_id: user?.id ?? null,
    category: input.category,
    message: input.message.trim(),
    app_version: input.appVersion ?? '1.0.0',
    platform: input.platform ?? Platform.OS,
  });

  if (error) {
    logger.warn('Failed to submit feedback', { error: error.message });
    throw new Error(error.message);
  }
}
