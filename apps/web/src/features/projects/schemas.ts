import { z } from 'zod';

export const IDENTIFIER_REGEX = /^[A-Z][A-Z0-9]{1,5}$/;

/** "Dev Sync Web" → "DSW"; single word → its first 6 letters/digits. */
export const suggestIdentifier = (name: string): string => {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const raw = words.length > 1 ? words.map((w) => w[0]).join('') : (words[0] ?? '');
  return raw.replace(/^[^A-Z]+/, '').slice(0, 6);
};

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
  identifier: z
    .string()
    .regex(IDENTIFIER_REGEX, 'Use 2 to 6 uppercase letters or digits, starting with a letter'),
  description: z.string().trim().max(500, 'Description must be 500 characters or fewer'),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
