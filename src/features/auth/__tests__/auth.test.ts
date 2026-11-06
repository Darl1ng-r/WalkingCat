import { describe, expect, it } from '@jest/globals';

import { mapAuthError } from '../errors';
import {
  profileFormSchema,
  signInSchema,
  signUpSchema,
  usernameSchema,
} from '../schemas';

describe('auth schemas', () => {
  describe('usernameSchema', () => {
    it('accepts valid usernames (3-20 chars, alphanumeric + underscore)', () => {
      expect(usernameSchema.safeParse('cat_walker1').success).toBe(true);
      expect(usernameSchema.safeParse('abc').success).toBe(true);
    });

    it('rejects too-short, too-long, or invalid-character usernames', () => {
      expect(usernameSchema.safeParse('ab').success).toBe(false);
      expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false);
      expect(usernameSchema.safeParse('cat-walker!').success).toBe(false);
      expect(usernameSchema.safeParse('cat walker').success).toBe(false);
    });
  });

  describe('signInSchema & signUpSchema', () => {
    it('validates email and password requirements', () => {
      expect(
        signInSchema.safeParse({ email: 'user@example.com', password: 'secret' }).success
      ).toBe(true);
      expect(
        signUpSchema.safeParse({ email: 'user@example.com', password: 'short' }).success
      ).toBe(false);
      expect(
        signUpSchema.safeParse({ email: 'user@example.com', password: 'password123' }).success
      ).toBe(true);
    });
  });

  describe('profileFormSchema', () => {
    it('accepts optional displayName and weightKg within 20..300', () => {
      expect(
        profileFormSchema.safeParse({
          username: 'stray_explorer',
          displayName: 'Alex',
          weightKg: '68.5',
        }).success
      ).toBe(true);

      expect(
        profileFormSchema.safeParse({
          username: 'stray_explorer',
          displayName: '',
          weightKg: '',
        }).success
      ).toBe(true);
    });

    it('rejects out-of-range weight', () => {
      expect(
        profileFormSchema.safeParse({
          username: 'stray_explorer',
          weightKg: '10',
        }).success
      ).toBe(false);
      expect(
        profileFormSchema.safeParse({
          username: 'stray_explorer',
          weightKg: '400',
        }).success
      ).toBe(false);
    });
  });
});

describe('mapAuthError', () => {
  it('maps invalid login credentials to friendly message', () => {
    expect(mapAuthError(new Error('Invalid login credentials'))).toBe(
      'Incorrect email or password. Please check and try again.'
    );
  });

  it('maps duplicate email and username constraint errors', () => {
    expect(mapAuthError(new Error('User already registered'))).toContain(
      'already exists'
    );
    expect(mapAuthError({ code: '23505', message: 'duplicate key value' })).toContain(
      'username is already taken'
    );
  });

  it('maps network errors to connection guidance', () => {
    expect(mapAuthError(new Error('Network request failed'))).toContain(
      'check your internet connection'
    );
  });
});
