/**
 * src/blog.js — BuildAlpha
 * Logique de la page listing blog (blog.html)
 */
import { getPosts, getCategories } from './wordpress.js'

// ── État ──
let allPosts = []
let activeCategoryId = null

// ── Utils ──
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').trim()
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function categoryColor(id) {
  const colors = ['var(--gold)', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#34d399']
  return colors[id % colors.length]
}

// ── Skeleton loader ──
function renderSkeletons(n = 6) {
  return Array.from({ length: n }, () => `
    <div class="post-card skeleton">
      <div class="sk-img"></div>
      <div class="sk-cat"></div>
      <div class="sk-title"></div>
      <div class="sk-title sk-short"></div>
      <div class="sk-meta"></div>
    </div>
  `).join('')
}

// ── Carte article ──
function renderCard(post, featured = false) {
  const title = stripHtml(post.title)
  const excerpt = stripHtml(post.excerpt).slice(0, featured ? 200 : 120) + '…'
  const date = formatDate(post.date)
  return `
    <article class="post-card${featured ? ' featured' : ''}" onclick="window.location='/article.html?slug=${post.slug}'">
      ${post.featuredImageUrl
        ? `<div class="card-img" style="background-image:url('${post.featuredImageUrl}')"></div>`
        : `<div class="card-img card-img-placeholder"><svg viewBox="0 0 80 50" width="80" opacity="0.15"><rect x="5" y="20" width="10" height="30" fill="#c9a84c"/><rect x="20" y="12" width="14" height="38" fill="#c9a84c"/><rect x="40" y="8" width="16" height="42" fill="#c9a84c"/><rect x="62" y="16" width="12" height="34" fill="#c9a84c"/></svg></div>`
      }
      <div class="card-body">
        <div class="card-cat" style="color:${categoryColor(post.categories?.[0] ?? 0)}">${post._categoryName || 'Analyse'}</div>
        <h3 class="card-title">${title}</h3>
        ${featured ? `<p class="card-excerpt">${excerpt}</p>` : ''}
        <div class="card-meta">
          <span>${date}</span>
          <span>·</span>
          <span>${post.readingTime || '5'} min de lecture</span>
        </div>
      </div>
    </article>
  `
}

// ── Render grille ──
function renderGrid(posts) {
  const grid = document.getElementById('postsGrid')
  const count = document.getElementById('resultCount')
  if (!posts.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◎</div>
        <div class="empty-title">Aucun article trouvé</div>
        <div class="empty-sub">Modifiez vos filtres ou revenez plus tard</div>
      </div>`
    count.textContent = '0'
    return
  }
  count.textContent = posts.length
  grid.innerHTML = posts.map((p, i) => renderCard(p, i === 0)).join('')
}

// ── Render catégories ──
function renderCategories(cats) {
  const bar = document.getElementById('catsBar')
  const allBtn = `<button class="cat-btn active" data-id="">Tous</button>`
  const catBtns = cats.map(c => `
    <button class="cat-btn" data-id="${c.id}">${c.name}
      <span class="cat-count">${c.count}</span>
    </button>
  `).join('')
  bar.innerHTML = allBtn + catBtns

  bar.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const id = btn.dataset.id ? parseInt(btn.dataset.id) : null
      activeCategoryId = id
      const filtered = id ? allPosts.filter(p => p.categories?.includes(id)) : allPosts
      renderGrid(filtered)
    })
  })
}

// ── Recherche ──
function setupSearch() {
  const input = document.getElementById('searchInput')
  if (!input) return
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim()
    const filtered = allPosts.filter(p =>
      !activeCategoryId || p.categories?.includes(activeCategoryId)
    ).filter(p =>
      !q ||
      stripHtml(p.title).toLowerCase().includes(q) ||
      stripHtml(p.excerpt).toLowerCase().includes(q)
    )
    renderGrid(filtered)
  })
}

// ── Init ──
async function init() {
  const grid = document.getElementById('postsGrid')
  grid.innerHTML = renderSkeletons()

  const [posts, cats] = await Promise.all([getPosts({ count: 50 }), getCategories()])

  // Injecte le nom de catégorie dans chaque post
  const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]))
  allPosts = posts.map(p => ({
    ...p,
    _categoryName: catMap[p.categories?.[0]] ?? 'Analyse',
  }))

  renderCategories(cats)
  renderGrid(allPosts)
  setupSearch()
}

document.addEventListener('DOMContentLoaded', init)
