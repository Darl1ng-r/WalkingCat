export {
  checkUsernameAvailable,
  getMyProfile,
  resetPassword,
  signIn,
  signOut,
  signUp,
  updateMyProfile,
  type SignUpResult,
} from './api';
export { mapAuthError } from './errors';
export {
  useUsernameAvailability,
  type UsernameAvailabilityStatus,
} from './hooks/use-username-availability';
export {
  emailSchema,
  forgotPasswordSchema,
  passwordSchema,
  profileFormSchema,
  signInSchema,
  signUpSchema,
  usernameSchema,
  type ForgotPasswordInput,
  type ProfileFormInput,
  type SignInInput,
  type SignUpInput,
} from './schemas';
export { SessionProvider, useSession, type SessionContextValue } from './session-provider';
export type { PrivacySettings, Profile, ProfileUpdate } from './types';
