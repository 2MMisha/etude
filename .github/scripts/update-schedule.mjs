// Writes/overwrites src/content/schedule/<id>.json from environment variables
// populated by the "Schedule: Add or Update Slot" GitHub Actions workflow.
// Run with: node .github/scripts/update-schedule.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const LEVELS = ['beginner', 'intermediate', 'advanced', 'private'];

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
    `Invalid id "${id}" — use lowercase letters, numbers, and hyphens only (e.g. "mon-latin-beginner").`
  );
}

const day = requireEnv('INPUT_DAY').toLowerCase();
if (!DAYS.includes(day)) {
  throw new Error(`Invalid day "${day}" — must be one of: ${DAYS.join(', ')}`);
}

const level = requireEnv('INPUT_LEVEL').toLowerCase();
if (!LEVELS.includes(level)) {
  throw new Error(`Invalid level "${level}" — must be one of: ${LEVELS.join(', ')}`);
}

const startTime = requireEnv('INPUT_START_TIME');
const endTime = requireEnv('INPUT_END_TIME');
for (const [label, value] of [['start time', startTime], ['end time', endTime]]) {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid ${label} "${value}" — use 24-hour HH:MM format (e.g. "18:30").`);
  }
}

const slot = {
  day,
  startTime,
  endTime,
  level,
  className: {
    he: requireEnv('INPUT_CLASS_NAME_HE'),
    en: requireEnv('INPUT_CLASS_NAME_EN'),
    ru: requireEnv('INPUT_CLASS_NAME_RU'),
  },
};

const dir = 'src/content/schedule';
if (!existsSync(dir)) {
  await mkdir(dir, { recursive: true });
}

const filePath = `${dir}/${id}.json`;
await writeFile(filePath, JSON.stringify(slot, null, 2) + '\n', 'utf-8');

console.log(`Wrote ${filePath}`);
