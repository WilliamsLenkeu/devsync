import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { THEME_OPTIONS } from '@/components/layout/ThemeToggle';
import { PageHeader } from '@/components/states';
import { useUser } from '@/lib/auth';
import { useTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function AppSettingsPage() {
  useDocumentTitle('App settings');
  const { theme, setTheme } = useTheme();
  const user = useUser();

  return (
    <div className="mx-auto grid max-w-2xl gap-10 p-6 lg:p-8">
      <PageHeader title="App settings" description="Preferences are saved on this device." />

      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-medium">Theme</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50',
                theme === o.value && 'border-primary bg-accent text-accent-foreground',
              )}
            >
              <input
                type="radio"
                name="theme"
                value={o.value}
                checked={theme === o.value}
                onChange={() => setTheme(o.value as Theme)}
                className="sr-only"
              />
              <o.icon className="size-4" aria-hidden />
              {o.label}
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">System follows your operating system's light or dark setting.</p>
      </fieldset>

      <section aria-labelledby="about-title" className="grid gap-2 border-t pt-8">
        <h2 id="about-title" className="text-sm font-medium">
          About
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          DevSync is collaboration software for dev teams: boards, activity and roles, plus an API and an MCP server for
          AI coding agents.
        </p>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
      </section>
    </div>
  );
}
