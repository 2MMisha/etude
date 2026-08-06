// Writes/overwrites src/content/news/<id>.json from environment variables
// populated by the "News: Add or Update Post" GitHub Actions workflow.
// Run with: node .github/scripts/update-news.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required input: ${name}`);
  }
  return value.trim();
}

const id = requireEnv('INPUT_ID').toLowerCase();
if (!SLUG_PATTERN.test(id)) {
  throw new Error(
    `Invalid id "${id}" — use lowercase letters, numbers, and hyphens only (e.g. "new-beginner-group").`
  );
}

const date = requireEnv('INPUT_DATE');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  throw new Error(`Invalid date "${date}" — use YYYY-MM-DD format (e.g. "2026-08-15").`);
}

const image = (process.env.INPUT_IMAGE || '').trim();

const post = {
  date,
  image,
  title: {
    he: requireEnv('INPUT_TITLE_HE'),
    en: requireEnv('INPUT_TITLE_EN'),
    ru: requireEnv('INPUT_TITLE_RU'),
  },
  body: {
    he: requireEnv('INPUT_BODY_HE'),
    en: requireEnv('INPUT_BODY_EN'),
    ru: requireEnv('INPUT_BODY_RU'),
  },
};

const dir = 'src/content/news';
if (!existsSync(dir)) {
  await mkdir(dir, { recursive: true });
}

const filePath = `${dir}/${id}.json`;
await writeFile(filePath, JSON.stringify(post, null, 2) + '\n', 'utf-8');

console.log(`Wrote ${filePath}`);
