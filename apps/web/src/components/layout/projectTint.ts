/** Stable muted tint from project identifier. Signal/ink token family only (DESIGN.md). */
export function projectTint(id: string): string {
  const hues = [
    'bg-primary',
    'bg-primary/70',
    'bg-cyan',
    'bg-foreground/45',
    'bg-muted-foreground',
    'bg-accent-foreground/70',
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % hues.length;
  return hues[h]!;
}
