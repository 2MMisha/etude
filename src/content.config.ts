import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Each News post is one JSON file per entry: src/content/news/<id>.json
// Written/updated by staff via the hidden /admin/ panel (see README
// "Editing content: the admin panel") — do not hand-edit unless you're
// comfortable with the JSON format.
const news = defineCollection({
  loader: glob({ pattern: '**/*.json', base: 'src/content/news' }),
  schema: z.object({
    // Same id is used as the URL slug for every language
    date: z.string(), // ISO date, e.g. "2026-08-01"
    image: z.string().optional(), // URL; falls back to a placeholder when absent
    // What the photo shows (alt text + caption) and who took it, per language.
    imageAlt: z.object({ he: z.string(), en: z.string(), ru: z.string() }).partial().optional(),
    imageCredit: z.object({ he: z.string(), en: z.string(), ru: z.string() }).partial().optional(),
    title: z.object({ he: z.string(), en: z.string(), ru: z.string() }),
    body: z.object({ he: z.string(), en: z.string(), ru: z.string() }),
    hideOnDisplay: z.boolean().optional(), // keep this post off the studio TV (/display/)
  }),
});

// The weekly schedule comes from the CRM since 2026-11-20 (src/lib/publicWeek.ts), not from files here.

// Each Instructor is one JSON file per person: src/content/instructors/<id>.json
// Written/updated via the hidden /admin/ panel.
const instructors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: 'src/content/instructors' }),
  schema: z.object({
    order: z.number(), // display order, lowest first
    photo: z.string().optional(), // URL; falls back to a placeholder when absent
    name: z.object({ he: z.string(), en: z.string(), ru: z.string() }),
    bio: z.object({ he: z.string(), en: z.string(), ru: z.string() }),
  }),
});

export const collections = { news, instructors };
