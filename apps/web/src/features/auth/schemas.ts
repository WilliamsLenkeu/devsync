import { z } from 'zod';

const email = z.email('Enter a valid email address');
const name = z.string().trim().min(1, 'Enter your name').max(100, 'Use 100 characters or fewer');
const newPassword = z.string().min(8, 'Use at least 8 characters');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({ name, email, password: newPassword });
export type RegisterInput = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  name,
  avatarUrl: z.union([z.literal(''), z.url('Enter a valid URL starting with https://')]),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
