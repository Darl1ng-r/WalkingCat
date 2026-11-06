import { useEffect, useState } from 'react';

import { checkUsernameAvailable } from '../api';
import { usernameSchema } from '../schemas';

export type UsernameAvailabilityStatus =
  | 'idle'
  | 'invalid'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error';

export function useUsernameAvailability(username: string, currentUsername?: string | null) {
  const trimmed = username.trim().toLowerCase();
  const isCurrent = Boolean(
    trimmed && currentUsername && trimmed === currentUsername.trim().toLowerCase()
  );
  const isFormatValid = Boolean(trimmed && usernameSchema.safeParse(trimmed).success);

  const [asyncResult, setAsyncResult] = useState<{
    checkedValue: string;
    outcome: 'available' | 'taken' | 'error';
  } | null>(null);

  useEffect(() => {
    if (!trimmed || isCurrent || !isFormatValid) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(trimmed);
        if (!cancelled) {
          setAsyncResult({
            checkedValue: trimmed,
            outcome: available ? 'available' : 'taken',
          });
        }
      } catch {
        if (!cancelled) {
          setAsyncResult({
            checkedValue: trimmed,
            outcome: 'error',
          });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, isCurrent, isFormatValid]);

  if (!trimmed) {
    return 'idle';
  }
  if (isCurrent) {
    return 'available';
  }
  if (!isFormatValid) {
    return 'invalid';
  }
  if (!asyncResult || asyncResult.checkedValue !== trimmed) {
    return 'checking';
  }
  return asyncResult.outcome;
}
