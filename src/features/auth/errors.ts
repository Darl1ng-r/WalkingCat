/**
 * Maps Supabase Auth and database errors to clear, non-technical messages.
 */
export function mapAuthError(error: unknown): string {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  const rawMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'Incorrect email or password. Please check and try again.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (lower.includes('password should be at least')) {
    return 'Please choose a stronger password (at least 8 characters).';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address using the link sent to your inbox.';
  }

  if (
    code === '23505' ||
    lower.includes('profiles_username_key') ||
    lower.includes('duplicate key value')
  ) {
    return 'That username is already taken. Please try another one.';
  }

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch error') ||
    lower.includes('networkerror')
  ) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }

  return rawMessage || 'Something went wrong. Please try again.';
}
