import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        valeurs: resolve(__dirname, 'valeurs-cotees.html'),
        ma: resolve(__dirname, 'ma.html'),
        'ma-entreprise': resolve(__dirname, 'ma-entreprise.html'),
        blog: resolve(__dirname, 'blog.html'),
        article: resolve(__dirname, 'article.html'),
      },
    },
  },
})
