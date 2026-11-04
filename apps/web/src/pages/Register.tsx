import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/features/auth/AuthShell';
import { Field, FormAlert } from '@/features/auth/Field';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { safeNext, withNext } from '@/features/auth/redirect';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function RegisterPage() {
  useDocumentTitle('Create account');
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterInput) => {
    try {
      await createAccount(values);
      navigate(safeNext(next), { replace: true });
    } catch (err) {
      setError('root', { message: errorMessage(err, 'Could not create the account') });
    }
  };

  return (
    <AuthShell title="Create your account" description="Set up your profile. You can create or join workspaces next.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {errors.root && <FormAlert message={errors.root.message ?? 'Could not create the account'} />}
        <Field id="name" label="Name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            {...register('password')}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={withNext('/login', next)} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
