/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via yahoo-finance2 (Node.js serverless, PAS Edge Runtime).
 * La lib gère l'auth Yahoo en interne — fonctionne depuis les serveurs Vercel.
 * Cache Vercel Edge 10 min → si 5000 visiteurs arrivent ensemble, 1 seul appel Yahoo.
 *
 * Aucune clé API requise.
 * GET /api/quotes
 * GET /api/quotes?debug=1
 */

import yahooFinance from 'yahoo-finance2'

const STOCKS = [
  { yf: 'VIE.PA',  name: 'VINCI',           id: 'vinci' },
  { yf: 'FGR.PA',  name: 'EIFFAGE',         id: 'eiffage' },
  { yf: 'EN.PA',   name: 'BOUYGUES',        id: 'bouygues' },
  { yf: 'SGO.PA',  name: 'SAINT-GOBAIN',    id: 'saint-gobain' },
  { yf: 'NXI.PA',  name: 'NEXITY',          id: 'nexity' },
  { yf: 'KOF.PA',  name: 'KAUFMAN & BROAD', id: 'kaufman' },
  { yf: 'LR.PA',   name: 'LEGRAND',         id: 'legrand' },
  { yf: 'NK.PA',   name: 'IMERYS',          id: 'imerys' },
  { yf: 'VCT.PA',  name: 'VICAT',           id: 'vicat' },
  { yf: 'BA.PA',   name: 'BASSAC',          id: 'bassac' },
  { yf: 'SPIE.PA', name: 'SPIE',            id: 'spie' },
  { yf: 'SU.PA',   name: 'SCHNEIDER',       id: 'schneider' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache Vercel Edge 10 min — tous les visiteurs partagent la même réponse
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const debug = (req.url || '').includes('debug=1')

  try {
    // Requêtes parallèles — si une action échoue, les autres continuent
    const results = await Promise.all(
      STOCKS.map(s =>
        yahooFinance.quote(s.yf, { fields: [
          'regularMarketPrice',
          'regularMarketChange',
          'regularMarketChangePercent',
          'regularMarketPreviousClose',
          'currency',
          'marketState',
        ]}).catch(err => {
          console.warn(`[Quotes] ${s.yf} échoué:`, err.message)
          return null
        })
      )
    )

    if (debug) {
      return res.status(200).json({ debug: results })
    }

    const quotes = STOCKS.map((s, i) => {
      const q = results[i]
      if (!q || !q.regularMarketPrice) return null

      return {
        id:            s.id,
        symbol:        s.yf,
        name:          s.name,
        price:         Math.round((q.regularMarketPrice ?? 0) * 100) / 100,
        change:        Math.round((q.regularMarketChange ?? 0) * 100) / 100,
        changePercent: Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
        prevClose:     Math.round((q.regularMarketPreviousClose ?? 0) * 100) / 100,
        currency:      q.currency ?? 'EUR',
        isOpen:        q.marketState === 'REGULAR',
      }
    }).filter(Boolean)

    if (quotes.length === 0) {
      return res.status(200).json({
        quotes: [],
        count: 0,
        marketClosed: true,
        message: 'Marchés fermés ou données temporairement indisponibles',
        timestamp: new Date().toISOString(),
      })
    }

    return res.status(200).json({
      quotes,
      count: quotes.length,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[Quotes] ERREUR:', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
