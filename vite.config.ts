import { defineConfig } from 'vitest/config';
import { pluginPrechargePolices, pluginSite, toutesLesPages } from './build/site.ts';

export default defineConfig({
  // Chemins relatifs : le site fonctionne à la racine du domaine comme dans un sous-dossier.
  base: './',
  plugins: [pluginSite(), pluginPrechargePolices()],
  build: {
    // DOSSIER_SORTIE sert au test de bout en bout (construction de démonstration à part).
    outDir: process.env.DOSSIER_SORTIE ?? 'dist',
    rollupOptions: { input: toutesLesPages(import.meta.dirname) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'build/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
