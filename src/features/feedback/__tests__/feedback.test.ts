import { describe, expect, it } from '@jest/globals';

import {
  FEEDBACK_CATEGORIES,
  submitUserFeedback,
  validateFeedbackMessage,
} from '../api';

describe('In-App Tester Feedback (Phase 12)', () => {
  describe('Feedback Category Options', () => {
    it('provides all 4 core beta feedback categories', () => {
      const keys = FEEDBACK_CATEGORIES.map((c) => c.key);
      expect(keys).toEqual(['bug', 'idea', 'praise', 'other']);
    });

    it('has non-empty emojis and descriptions for every category', () => {
      FEEDBACK_CATEGORIES.forEach((cat) => {
        expect(cat.emoji.length).toBeGreaterThan(0);
        expect(cat.label.length).toBeGreaterThan(0);
        expect(cat.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validation & Length Constraints', () => {
    it('rejects empty or very short messages (< 5 chars)', () => {
      expect(validateFeedbackMessage('')).toEqual({
        valid: false,
        error: 'Please enter at least 5 characters.',
      });
      expect(validateFeedbackMessage('hey')).toEqual({
        valid: false,
        error: 'Please enter at least 5 characters.',
      });
    });

    it('rejects messages over 2,000 characters', () => {
      const huge = 'a'.repeat(2001);
      expect(validateFeedbackMessage(huge)).toEqual({
        valid: false,
        error: 'Feedback message cannot exceed 2,000 characters.',
      });
    });

    it('accepts valid messages between 5 and 2,000 characters', () => {
      expect(validateFeedbackMessage('Great app! Found 2 cats today.')).toEqual({
        valid: true,
      });
    });
  });

  describe('Offline Submission Guardrails', () => {
    it('gracefully handles offline/demo feedback submission without throwing', async () => {
      await expect(
        submitUserFeedback({
          category: 'praise',
          message: 'Loved the route trimming feature!',
        })
      ).resolves.not.toThrow();
    });

    it('throws error when message is invalid during submission', async () => {
      await expect(
        submitUserFeedback({
          category: 'bug',
          message: 'x',
        })
      ).rejects.toThrow('Please enter at least 5 characters.');
    });
  });
});
