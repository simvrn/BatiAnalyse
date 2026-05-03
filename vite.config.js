import { defineConfig } from 'vite'
import { resolve } from 'path'
<<<<<<< HEAD

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
=======
import fs from 'fs'
import path from 'path'

const BASE_URL = 'https://batianalyse.fr'

// Liste exhaustive des pages avec leur config SEO
const PAGES = [
  { url: '/',                  changefreq: 'weekly',  priority: '1.0' },
  { url: '/valeurs-cotees',    changefreq: 'daily',   priority: '0.9' },
  { url: '/macro',             changefreq: 'daily',   priority: '0.9' },
  { url: '/ma',                changefreq: 'weekly',  priority: '0.8' },
  { url: '/ma-hub',            changefreq: 'weekly',  priority: '0.8' },
  { url: '/blog',              changefreq: 'weekly',  priority: '0.8' },
  { url: '/entreprise',        changefreq: 'weekly',  priority: '0.7' },
  { url: '/contech',           changefreq: 'weekly',  priority: '0.7' },
  { url: '/pe',                changefreq: 'weekly',  priority: '0.7' },
  { url: '/btp-private-equity', changefreq: 'monthly', priority: '0.6' },
  { url: '/reglementation',    changefreq: 'monthly', priority: '0.7' },
  { url: '/lbo',               changefreq: 'monthly', priority: '0.6' },
  { url: '/ma-analyse',        changefreq: 'monthly', priority: '0.5' },
  { url: '/ma-deals',          changefreq: 'monthly', priority: '0.5' },
  { url: '/ma-risques',        changefreq: 'monthly', priority: '0.5' },
  { url: '/ma-valeur',         changefreq: 'monthly', priority: '0.5' },
  { url: '/ma-joint-ventures', changefreq: 'monthly', priority: '0.5' },
  { url: '/ma-build-up',       changefreq: 'monthly', priority: '0.5' },
  { url: '/ma-expansion',      changefreq: 'monthly', priority: '0.5' },
  { url: '/ma-ipo',            changefreq: 'monthly', priority: '0.5' },
  { url: '/spie-euroconfort',  changefreq: 'monthly', priority: '0.6' },
  { url: '/bouygues-equans',   changefreq: 'monthly', priority: '0.6' },
  // mentions-legales, article, macro-detail : noindex, non inclus
]

function sitemapPlugin() {
  return {
    name: 'generate-sitemap',
    closeBundle() {
      const today = new Date().toISOString().split('T')[0]
      const urls = PAGES.map(p => `
  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('')

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`

      const outDir = path.resolve('dist')
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml)
      console.log(`✓ sitemap.xml généré (${PAGES.length} URLs)`)
    }
  }
}

export default defineConfig({
  publicDir: 'public',
  plugins: [sitemapPlugin()],
  build: {
    rollupOptions: {
      input: {
        main:                resolve(__dirname, 'index.html'),
        valeurs:             resolve(__dirname, 'valeurs-cotees.html'),
        ma:                  resolve(__dirname, 'ma.html'),
        'ma-entreprise':     resolve(__dirname, 'ma-entreprise.html'),
        pe:                  resolve(__dirname, 'pe.html'),
        macro:               resolve(__dirname, 'macro.html'),
        reglementation:      resolve(__dirname, 'reglementation.html'),
        contech:             resolve(__dirname, 'contech.html'),
        blog:                resolve(__dirname, 'blog.html'),
        article:             resolve(__dirname, 'article.html'),
        entreprise:          resolve(__dirname, 'entreprise.html'),
        'ma-hub':            resolve(__dirname, 'ma-hub.html'),
        lbo:                 resolve(__dirname, 'lbo.html'),
        'mentions-legales':  resolve(__dirname, 'mentions-legales.html'),
>>>>>>> c28601ea3433019a35e0b8f37d231dca460dccef
        'ma-analyse':        resolve(__dirname, 'ma-analyse.html'),
        'ma-risques':        resolve(__dirname, 'ma-risques.html'),
        'ma-valeur':         resolve(__dirname, 'ma-valeur.html'),
        'ma-joint-ventures': resolve(__dirname, 'ma-joint-ventures.html'),
        'ma-build-up':       resolve(__dirname, 'ma-build-up.html'),
        'ma-deals':          resolve(__dirname, 'ma-deals.html'),
        'ma-expansion':      resolve(__dirname, 'ma-expansion.html'),
        'ma-ipo':            resolve(__dirname, 'ma-ipo.html'),
        'macro-detail':      resolve(__dirname, 'macro-detail.html'),
<<<<<<< HEAD
=======
        'spie-euroconfort':  resolve(__dirname, 'spie-euroconfort.html'),
        'btp-private-equity': resolve(__dirname, 'btp-private-equity.html'),
        'lbo-btp':            resolve(__dirname, 'lbo-btp.html'),
        'pe-btp-instruments': resolve(__dirname, 'pe-btp-instruments.html'),
        'bouygues-equans':    resolve(__dirname, 'bouygues-equans.html'),
>>>>>>> c28601ea3433019a35e0b8f37d231dca460dccef
      },
    },
  },
})
