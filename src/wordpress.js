/**
 * wordpress.js — BatiAnalyse
 * Lecture des articles : Firestore (cache) → fallback WP REST API
 */
import { db } from './firebase.js'
import {
  collection, getDocs, doc, getDoc,
  query, orderBy, limit, where
} from 'firebase/firestore'

const WP_URL = import.meta.env.VITE_WP_URL || ''

// ── Normalise un post brut (WP API ou Firestore) en objet uniforme ──
function normalizePost(raw) {
  // Déjà normalisé (vient de Firestore)
  if (raw.slug && typeof raw.title === 'string') return raw
  // Vient de WP REST API
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title?.rendered ?? '',
    excerpt: raw.excerpt?.rendered ?? '',
    content: raw.content?.rendered ?? '',
    date: raw.date,
    modified: raw.modified,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    featuredImageUrl: raw._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
    featuredImageAlt: raw._embedded?.['wp:featuredmedia']?.[0]?.alt_text ?? '',
    authorName: raw._embedded?.author?.[0]?.name ?? 'BatiAnalyse',
    readingTime: estimateReadingTime(raw.content?.rendered ?? ''),
    syncedAt: new Date().toISOString(),
  }
}

function estimateReadingTime(html) {
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length
  return Math.max(1, Math.round(words / 200)) // ~200 mots/min
}

// ── Récupère la liste des articles ──
export async function getPosts({ categoryId = null, count = 20, page = 1 } = {}) {
  // 1. Essai Firestore
  if (db) {
    try {
      let q = query(
        collection(db, 'blog_posts'),
        orderBy('date', 'desc'),
        limit(count)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        let posts = snap.docs.map(d => d.data())
        if (categoryId) posts = posts.filter(p => p.categories?.includes(categoryId))
        return posts
      }
    } catch (e) {
      console.warn('[WP] Firestore indisponible, fallback WP API', e.message)
    }
  }

  // 2. Fallback WP REST API
  return fetchPostsFromWP({ categoryId, count, page })
}

// ── Récupère un article par slug ──
export async function getPost(slug) {
  if (!slug) return null

  // 1. Essai Firestore
  if (db) {
    try {
      const q = query(collection(db, 'blog_posts'), where('slug', '==', slug))
      const snap = await getDocs(q)
      if (!snap.empty) return snap.docs[0].data()
    } catch (e) {
      console.warn('[WP] Firestore indisponible, fallback WP API')
    }
  }

  // 2. Fallback WP REST API
  return fetchPostFromWP(slug)
}

// ── Récupère les catégories ──
export async function getCategories() {
  // Essai Firestore
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'blog_categories'))
      if (!snap.empty) return snap.docs.map(d => d.data())
    } catch (e) { /* fallback */ }
  }
  // Fallback WP
  if (!WP_URL) return []
  try {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/categories?per_page=50&hide_empty=true`)
    const data = await res.json()
    return data.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }))
  } catch (e) {
    return []
  }
}

// ── Appels directs WP REST API ──
async function fetchPostsFromWP({ categoryId, count, page }) {
  if (!WP_URL) return []
  try {
    let url = `${WP_URL}/wp-json/wp/v2/posts?per_page=${count}&page=${page}&status=publish&_embed`
    if (categoryId) url += `&categories=${categoryId}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`WP API ${res.status}`)
    const data = await res.json()
    return data.map(normalizePost)
  } catch (e) {
    console.error('[WP] Impossible de charger les articles:', e.message)
    return []
  }
}

async function fetchPostFromWP(slug) {
  if (!WP_URL) return null
  try {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/posts?slug=${slug}&_embed`)
    if (!res.ok) throw new Error(`WP API ${res.status}`)
    const data = await res.json()
    return data[0] ? normalizePost(data[0]) : null
  } catch (e) {
    console.error('[WP] Article introuvable:', e.message)
    return null
  }
}
