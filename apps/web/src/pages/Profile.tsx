import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { PageHeader } from '@/components/states';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FormAlert } from '@/features/auth/Field';
import { PasswordInput } from '@/features/auth/PasswordInput';
import {
  passwordChangeSchema,
  profileSchema,
  type PasswordChangeInput,
  type ProfileInput,
} from '@/features/auth/schemas';
import { api, errorMessage } from '@/lib/api';
import { useAuth, useUser } from '@/lib/auth';
import { usePageEnter } from '@/lib/motion';
import type { User } from '@/lib/types';

export function ProfilePage() {
  useDocumentTitle('Profile');
  const user = useUser();
  const rootRef = useRef<HTMLDivElement>(null);
  usePageEnter(rootRef);

  return (
    <div ref={rootRef} className="mx-auto grid max-w-xl gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Profile" description="How you appear to your teammates." />
      <ProfileForm user={user} />
      <PasswordForm />
    </div>
  );
}

function ProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, avatarUrl: user.avatarUrl ?? '' },
  });
  const avatarUrl = watch('avatarUrl');

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await api.patch<User>('/users/me', {
        name: values.name,
        avatarUrl: values.avatarUrl || null,
      });
      setUser(updated);
      reset({ name: updated.name, avatarUrl: updated.avatarUrl ?? '' });
      toast.success('Profile updated');
    } catch (err) {
      setError('root', { message: errorMessage(err, 'Could not update the profile') });
    }
  });

  return (
    <section
      aria-labelledby="profile-title"
      className="grid gap-4 rounded-lg border border-[#DEE2E6] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div>
        <h2 id="profile-title" className="text-sm font-semibold text-[#212529]">
          Profile details
        </h2>
        <p className="mt-0.5 text-sm text-[#6C757D]">
          Email is managed by your account and cannot be changed here.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <UserAvatar
          user={{ name: user.name, avatarUrl: avatarUrl || null }}
          className="size-12 text-sm"
        />
        <div className="min-w-0 text-sm">
          <p className="font-medium text-[#212529]">{user.name}</p>
          <p className="truncate text-[#6C757D]">{user.email}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {errors.root && (
          <FormAlert message={errors.root.message ?? 'Could not update the profile'} />
        )}
        <Field id="profile-name" label="Name" error={errors.name?.message}>
          <Input
            id="profile-name"
            autoComplete="name"
            className="border-[#DEE2E6]"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'profile-name-error' : undefined}
            {...register('name')}
          />
        </Field>
        <Field id="profile-email" label="Email">
          <Input id="profile-email" value={user.email} readOnly disabled className="border-[#DEE2E6]" />
        </Field>
        <Field id="profile-avatar" label="Avatar URL (optional)" error={errors.avatarUrl?.message}>
          <Input
            id="profile-avatar"
            type="url"
            placeholder="https://example.com/me.png"
            className="border-[#DEE2E6]"
            aria-invalid={!!errors.avatarUrl}
            aria-describedby={errors.avatarUrl ? 'profile-avatar-error' : undefined}
            {...register('avatarUrl')}
          />
        </Field>
        <div>
          <Button
            type="submit"
            className="min-h-11 bg-[#017E84] text-white hover:bg-[#016a6f] sm:min-h-9"
            disabled={!isDirty || isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post('/users/me/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      toast.success('Password changed');
    } catch (err) {
      setError('root', { message: errorMessage(err, 'Could not change the password') });
    }
  });

  return (
    <section
      aria-labelledby="password-title"
      className="grid gap-4 rounded-lg border border-[#DEE2E6] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div>
        <h2 id="password-title" className="text-sm font-semibold text-[#212529]">
          Change password
        </h2>
        <p className="mt-0.5 text-sm text-[#6C757D]">Use at least 8 characters.</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {errors.root && (
          <FormAlert message={errors.root.message ?? 'Could not change the password'} />
        )}
        <Field
          id="current-password"
          label="Current password"
          error={errors.currentPassword?.message}
        >
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            className="border-[#DEE2E6]"
            aria-invalid={!!errors.currentPassword}
            aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
            {...register('currentPassword')}
          />
        </Field>
        <Field id="new-password" label="New password" error={errors.newPassword?.message}>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            className="border-[#DEE2E6]"
            aria-invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
            {...register('newPassword')}
          />
        </Field>
        <Field
          id="confirm-password"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            className="border-[#DEE2E6]"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            {...register('confirmPassword')}
          />
        </Field>
        <div>
          <Button
            type="submit"
            className="min-h-11 bg-[#017E84] text-white hover:bg-[#016a6f] sm:min-h-9"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </form>
    </section>
  );
}
