import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        valeurs: resolve(__dirname, 'valeurs-cotees.html'),
        ma: resolve(__dirname, 'ma.html'),
        'ma-entreprise': resolve(__dirname, 'ma-entreprise.html'),
        pe: resolve(__dirname, 'pe.html'),
        macro: resolve(__dirname, 'macro.html'),
        reglementation: resolve(__dirname, 'reglementation.html'),
        contech: resolve(__dirname, 'contech.html'),
        blog: resolve(__dirname, 'blog.html'),
        article: resolve(__dirname, 'article.html'),
        entreprise: resolve(__dirname, 'entreprise.html'),
        'ma-hub': resolve(__dirname, 'ma-hub.html'),
        lbo: resolve(__dirname, 'lbo.html'),
        'mentions-legales': resolve(__dirname, 'mentions-legales.html'),
        'ma-analyse':        resolve(__dirname, 'ma-analyse.html'),
        'ma-risques':        resolve(__dirname, 'ma-risques.html'),
        'ma-valeur':         resolve(__dirname, 'ma-valeur.html'),
        'ma-joint-ventures': resolve(__dirname, 'ma-joint-ventures.html'),
        'ma-build-up':       resolve(__dirname, 'ma-build-up.html'),
        'ma-deals':          resolve(__dirname, 'ma-deals.html'),
        'ma-expansion':      resolve(__dirname, 'ma-expansion.html'),
        'ma-ipo':            resolve(__dirname, 'ma-ipo.html'),
      },
    },
  },
})
