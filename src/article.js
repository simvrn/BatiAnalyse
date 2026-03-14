/**
 * src/article.js — BuildAlpha
 * Logique de la page article individuel (article.html)
 */
import { getPost, getPosts } from './wordpress.js'

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').trim()
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

// ── Affiche le skeleton ──
function showSkeleton() {
  document.getElementById('articleHeader').innerHTML = `
    <div class="sk-cat"></div>
    <div class="sk-h1"></div>
    <div class="sk-h1 sk-short"></div>
    <div class="sk-meta"></div>`
  document.getElementById('articleContent').innerHTML = `
    <div class="sk-p"></div><div class="sk-p"></div><div class="sk-p sk-short"></div>
    <div class="sk-p"></div><div class="sk-p"></div>`
}

// ── Affiche l'article ──
function renderArticle(post) {
  const title = stripHtml(post.title)
  const date = formatDate(post.date)
  document.title = `${title} — BuildAlpha`

  // Breadcrumb
  document.getElementById('breadcrumbTitle').textContent = title

  // Header
  document.getElementById('articleHeader').innerHTML = `
    <div class="art-cat">${post._categoryName || 'Analyse'}</div>
    <h1 class="art-title">${title}</h1>
    <div class="art-meta">
      <span class="art-author">${post.authorName || 'BuildAlpha'}</span>
      <span class="art-sep">·</span>
      <span>${date}</span>
      <span class="art-sep">·</span>
      <span>${post.readingTime || 5} min de lecture</span>
    </div>
  `

  // Image featured
  const imgWrap = document.getElementById('featuredImageWrap')
  if (post.featuredImageUrl) {
    imgWrap.innerHTML = `<img src="${post.featuredImageUrl}" alt="${post.featuredImageAlt || title}" class="featured-img">`
    imgWrap.style.display = 'block'
  }

  // Contenu WordPress rendu
  document.getElementById('articleContent').innerHTML = post.content || '<p>Contenu non disponible.</p>'
}

// ── Articles liés ──
async function renderRelated(currentSlug) {
  const posts = await getPosts({ count: 4 })
  const related = posts.filter(p => p.slug !== currentSlug).slice(0, 3)
  if (!related.length) return

  document.getElementById('relatedSection').style.display = 'block'
  document.getElementById('relatedGrid').innerHTML = related.map(p => `
    <article class="related-card" onclick="window.location='/article.html?slug=${p.slug}'">
      ${p.featuredImageUrl
        ? `<div class="related-img" style="background-image:url('${p.featuredImageUrl}')"></div>`
        : `<div class="related-img related-img-ph"></div>`
      }
      <div class="related-cat">${p._categoryName || 'Analyse'}</div>
      <div class="related-title">${stripHtml(p.title)}</div>
      <div class="related-date">${new Date(p.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}</div>
    </article>
  `).join('')
}

// ── État d'erreur ──
function showError() {
  document.getElementById('articleHeader').innerHTML = `
    <div class="not-found">
      <div class="nf-icon">◎</div>
      <h1 class="nf-title">Article introuvable</h1>
      <p class="nf-sub">Cet article n'existe pas ou a été supprimé.</p>
      <a href="/blog.html" class="nf-back">← Retour au blog</a>
    </div>`
  document.getElementById('articleContent').innerHTML = ''
}

// ── Init ──
async function init() {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get('slug')

  if (!slug) { showError(); return }

  showSkeleton()

  const post = await getPost(slug)
  if (!post) { showError(); return }

  renderArticle(post)
  renderRelated(slug)
}

document.addEventListener('DOMContentLoaded', init)
