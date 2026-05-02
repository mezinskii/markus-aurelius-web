// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://readaurelius.org';

export default defineConfig({
  site: SITE,
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru' },
      },
    }),
  ],
});
