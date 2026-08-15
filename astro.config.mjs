import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jrseguros.pages.dev',
  output: 'static',
  integrations: [sitemap()],
});
