// Deno unit test suite for `validate-sighting` decision rules.
// Run with: deno test supabase/functions/validate-sighting/rules_test.ts

import {
  computeDHash64FromGrayscale,
  decideSightingValidation,
  hammingDistanceHex64,
} from './rules.ts';

declare const Deno: {
  test(name: string, fn: () => void | Promise<void>): void;
};

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message ?? `Assertion failed: expected ${String(expected)}, got ${String(actual)}`
    );
  }
}

Deno.test('computeDHash64FromGrayscale and hammingDistanceHex64', () => {
  const grid = Array.from({ length: 72 }, (_, idx) => idx);
  const hash = computeDHash64FromGrayscale(grid);
  assertEquals(hash, '0000000000000000');
  assertEquals(hammingDistanceHex64(hash, '000000000000000f'), 4);
});

Deno.test('decideSightingValidation accepts clear cat photo', () => {
  const res = decideSightingValidation({
    imageValid: true,
    width: 1600,
    height: 1200,
    dhash: 'abcdef0123456789',
    recentPhashes: [],
    submissionsLast24h: 2,
    containsCat: true,
    catConfidence: 0.91,
    isRealPhoto: true,
    isSafe: true,
  });

  assertEquals(res.status, 'accepted');
  assertEquals(res.rejectReason, null);
});

Deno.test('decideSightingValidation rejects near-duplicates (hamming <= 6)', () => {
  const res = decideSightingValidation({
    imageValid: true,
    width: 1600,
    height: 1200,
    dhash: '0000000000000000',
    recentPhashes: ['0000000000000007'], // 3 bits difference
    submissionsLast24h: 2,
    containsCat: true,
    catConfidence: 0.95,
  });

  assertEquals(res.status, 'rejected');
  assertEquals(res.rejectReason, 'duplicate');
});

Deno.test('decideSightingValidation flags uncertain cat confidence', () => {
  const res = decideSightingValidation({
    imageValid: true,
    width: 1200,
    height: 900,
    dhash: 'abcdef0123456789',
    recentPhashes: [],
    submissionsLast24h: 1,
    containsCat: true,
    catConfidence: 0.62,
  });

  assertEquals(res.status, 'flagged');
  assertEquals(res.rejectReason, 'uncertain');
});
