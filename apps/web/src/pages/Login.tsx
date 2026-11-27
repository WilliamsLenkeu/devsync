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
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginInput) =>
    login(values.email, values.password).then(
      () => navigate(safeNext(next), { replace: true }),
      (err: unknown) => setError('root', { message: errorMessage(err, 'Sign in failed') }),
    );

  return (
    <AuthShell title="Sign in" description="Enter your email and password to open your workspaces.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {errors.root && <FormAlert message={errors.root.message ?? 'Sign in failed'} />}
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            disabled={isSubmitting}
            className="min-h-10 border-[#DEE2E6] bg-white sm:min-h-9"
            {...register('email')}
          />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            disabled={isSubmitting}
            className="min-h-10 border-[#DEE2E6] bg-white sm:min-h-9"
            {...register('password')}
          />
        </Field>
        <Button
          type="submit"
          className="mt-1 min-h-10 w-full bg-[#017E84] text-white hover:bg-[#016a6f] sm:min-h-9"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-[#6C757D]">
          New to DevSync?{' '}
          <Link
            to={withNext('/register', next)}
            className="font-medium text-[#017E84] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#017E84]/40 focus-visible:ring-offset-2"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
