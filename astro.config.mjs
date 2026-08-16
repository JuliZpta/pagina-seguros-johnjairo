import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://web.jrseguros.workers.dev',
  output: 'static',
  integrations: [sitemap()],
});
