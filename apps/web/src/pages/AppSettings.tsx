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
    <div className="mx-auto grid max-w-xl gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="App settings" description="Preferences are saved on this device." />

      <section aria-labelledby="theme-title" className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-none">
        <div>
          <h2 id="theme-title" className="text-sm font-medium">
            Theme
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            System follows your operating system light or dark setting.
          </p>
        </div>
        <fieldset>
          <legend className="sr-only">Theme</legend>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-labelledby="theme-title"
          >
            {THEME_OPTIONS.map((o) => {
              const selected = theme === o.value;
              return (
                <label
                  key={o.value}
                  className={cn(
                    'relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-accent/40 has-focus-visible:ring-2 has-focus-visible:ring-ring',
                    selected
                      ? 'border-primary/40 bg-accent pl-5 text-accent-foreground'
                      : 'border-border bg-background',
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={o.value}
                    checked={selected}
                    onChange={() => setTheme(o.value as Theme)}
                    className="sr-only"
                  />
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute left-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary"
                    />
                  )}
                  <o.icon className="size-4 shrink-0 opacity-80" aria-hidden />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="about-title" className="grid gap-2 border-t pt-6">
        <h2 id="about-title" className="text-sm font-medium">
          About
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          DevSync is collaboration software for dev teams: boards, activity, and roles.
        </p>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
      </section>
    </div>
  );
}
