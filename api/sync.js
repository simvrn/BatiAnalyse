/**
 * api/sync.js — BuildAlpha
 * Synchronisation manuelle : GET /api/sync?secret=<WEBHOOK_SECRET>
 * Utile pour le premier import ou un resync forcé.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

async function fetchAllPosts(wpUrl) {
  const posts = []
  let page = 1
  while (true) {
    const res = await fetch(`${wpUrl}/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish&_embed`)
    if (!res.ok) break
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    posts.push(...data)
    if (data.length < 100) break
    page++
  }
  return posts
}

async function fetchCategories(wpUrl) {
  try {
    const res = await fetch(`${wpUrl}/wp-json/wp/v2/categories?per_page=50&hide_empty=true`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }))
  } catch { return [] }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  // Vérification du secret (query param ou header)
  const secret = req.query?.secret || req.headers['x-webhook-secret']
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const wpUrl = process.env.WP_URL
  if (!wpUrl) return res.status(500).json({ error: 'WP_URL non configuré' })

  try {
    const db = getAdminDb()
    const [wpPosts, wpCategories] = await Promise.all([
      fetchAllPosts(wpUrl),
      fetchCategories(wpUrl),
    ])

    for (let i = 0; i < wpPosts.length; i += 500) {
      const batch = db.batch()
      for (const post of wpPosts.slice(i, i + 500)) {
        batch.set(db.collection('blog_posts').doc(String(post.id)), normalizePost(post), { merge: true })
      }
      await batch.commit()
    }

    if (wpCategories.length) {
      const batch = db.batch()
      for (const cat of wpCategories) {
        batch.set(db.collection('blog_categories').doc(String(cat.id)), cat, { merge: true })
      }
      await batch.commit()
    }

    return res.status(200).json({
      success: true,
      synced: wpPosts.length,
      categories: wpCategories.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
