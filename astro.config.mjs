// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://etude.ristar.co',
  output: 'static',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'he',
        locales: {
          he: 'he-IL',
          en: 'en-US',
          ru: 'ru-RU',
        },
      },
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});
