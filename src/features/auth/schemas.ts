import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z0-9_]+$/i, 'Only letters, numbers, and underscores are allowed');

export const emailSchema = z.string().trim().email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const profileFormSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .max(40, 'Display name must be 40 characters or fewer')
    .optional()
    .or(z.literal('')),
  weightKg: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val) return true;
        const num = Number(val);
        return Number.isFinite(num) && num >= 20 && num <= 300;
      },
      { message: 'Weight must be between 20 and 300 kg' }
    ),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ProfileFormInput = z.infer<typeof profileFormSchema>;
