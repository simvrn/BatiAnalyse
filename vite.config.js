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
      },
    },
  },
})
