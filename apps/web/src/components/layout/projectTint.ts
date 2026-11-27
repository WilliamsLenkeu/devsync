/** Teintes Milk Desk : teal + sémantiques Material (pas mint/cuivre). */
export function projectTint(id: string): string {
  const hues = [
    'bg-primary',
    'bg-primary/70',
    'bg-info',
    'bg-success',
    'bg-warning',
    'bg-muted-foreground',
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % hues.length;
  return hues[h]!;
}
