// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const SITE = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://readaurelius.org';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  adapter: vercel(),
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'EB Garamond',
      cssVariable: '--font-serif',
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext', 'cyrillic'],
      fallbacks: ['Times New Roman', 'Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-sans',
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'cyrillic'],
      fallbacks: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'cyrillic'],
      fallbacks: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
    },
  ],
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
