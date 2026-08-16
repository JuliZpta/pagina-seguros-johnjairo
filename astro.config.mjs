import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pagina-seguros-johnjairo.jrseguros.workers.dev',
  output: 'static',
  integrations: [sitemap()],
});
