/**
 * api/webhook.js — BuildAlpha
 * Reçoit le webhook WordPress lors d'une publication/modification d'article.
 * Synchronise les articles vers Firestore (cache).
 *
 * Vercel Serverless Function (Node.js)
 * POST /api/webhook
 * Header requis: x-webhook-secret: <WEBHOOK_SECRET>
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ── Init Firebase Admin (singleton) ──
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

// ── Normalise un post WP pour Firestore ──
function normalizePost(post) {
  const html = post.content?.rendered ?? ''
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length
  return {
    id: post.id,
    slug: post.slug,
    title: post.title?.rendered ?? '',
    excerpt: post.excerpt?.rendered ?? '',
    content: post.content?.rendered ?? '',
    date: post.date,
    modified: post.modified,
    status: post.status,
    categories: post.categories ?? [],
    tags: post.tags ?? [],
    featuredImageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
    featuredImageAlt: post._embedded?.['wp:featuredmedia']?.[0]?.alt_text ?? '',
    authorName: post._embedded?.author?.[0]?.name ?? 'BuildAlpha',
    readingTime: Math.max(1, Math.round(words / 200)),
    syncedAt: new Date().toISOString(),
  }
}

// ── Fetch tous les articles publiés depuis WP REST API ──
async function fetchAllPosts(wpUrl) {
  const posts = []
  let page = 1

  while (true) {
    const res = await fetch(
      `${wpUrl}/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish&_embed`
    )
    if (!res.ok) break
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    posts.push(...data)
    if (data.length < 100) break
    page++
  }

  return posts
}

// ── Fetch les catégories WP ──
async function fetchCategories(wpUrl) {
  try {
    const res = await fetch(`${wpUrl}/wp-json/wp/v2/categories?per_page=50&hide_empty=true`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }))
  } catch {
    return []
  }
}

// ── Handler principal ──
export default async function handler(req, res) {
  // CORS pour les requêtes de test depuis le navigateur
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Vérification du secret (query string ou header)
  const secret = req.query?.secret || req.headers['x-webhook-secret']
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized — secret invalide' })
  }

  const wpUrl = process.env.WP_URL
  if (!wpUrl) return res.status(500).json({ error: 'WP_URL non configuré' })

  try {
    const db = getAdminDb()

    // 1. Récupère tous les articles depuis WordPress
    console.log('[Webhook] Fetch articles depuis', wpUrl)
    const [wpPosts, wpCategories] = await Promise.all([
      fetchAllPosts(wpUrl),
      fetchCategories(wpUrl),
    ])
    console.log(`[Webhook] ${wpPosts.length} articles récupérés`)

    // 2. Sync articles vers Firestore (par batches de 500)
    const BATCH_SIZE = 500
    for (let i = 0; i < wpPosts.length; i += BATCH_SIZE) {
      const batch = db.batch()
      const chunk = wpPosts.slice(i, i + BATCH_SIZE)
      for (const post of chunk) {
        const ref = db.collection('blog_posts').doc(String(post.id))
        batch.set(ref, normalizePost(post), { merge: true })
      }
      await batch.commit()
    }

    // 3. Sync catégories
    if (wpCategories.length) {
      const batch = db.batch()
      for (const cat of wpCategories) {
        const ref = db.collection('blog_categories').doc(String(cat.id))
        batch.set(ref, cat, { merge: true })
      }
      await batch.commit()
    }

    // 4. Supprime les articles dépubliés (statut != publish)
    // (non géré ici pour garder simple — à implémenter si besoin)

    return res.status(200).json({
      success: true,
      synced: wpPosts.length,
      categories: wpCategories.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Webhook] Erreur:', error)
    return res.status(500).json({ error: error.message })
  }
}
