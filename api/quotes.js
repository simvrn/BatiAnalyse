/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via Stooq — gratuit, sans clé API.
 * Requêtes individuelles en parallèle (batch non supporté par Stooq CSV).
 * Cache Vercel Edge 30 min.
 *
 * Aucune variable d'environnement requise.
 * GET /api/quotes
 */

const STOCKS = [
  { symbol: 'vie.pa',  name: 'VINCI',           id: 'vinci' },
  { symbol: 'fgr.pa',  name: 'EIFFAGE',         id: 'eiffage' },
  { symbol: 'en.pa',   name: 'BOUYGUES',        id: 'bouygues' },
  { symbol: 'sgo.pa',  name: 'SAINT-GOBAIN',    id: 'saint-gobain' },
  { symbol: 'nxi.pa',  name: 'NEXITY',          id: 'nexity' },
  { symbol: 'kof.pa',  name: 'KAUFMAN & BROAD', id: 'kaufman' },
  { symbol: 'lr.pa',   name: 'LEGRAND',         id: 'legrand' },
  { symbol: 'nk.pa',   name: 'IMERYS',          id: 'imerys' },
  { symbol: 'vct.pa',  name: 'VICAT',           id: 'vicat' },
  { symbol: 'ba.pa',   name: 'BASSAC',          id: 'bassac' },
  { symbol: 'spie.pa', name: 'SPIE',            id: 'spie' },
  { symbol: 'su.pa',   name: 'SCHNEIDER',       id: 'schneider' },
]

// Fetche un seul symbole Stooq → { price, changePercent } ou null
async function fetchOne(symbol) {
  try {
    // f = s(symbol) d2(date) t2(time) o(open) h(high) l(low) c(close) v(volume) p(%chg)
    const url = `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcvp&h&e=csv`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BatiAnalyse/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null

    const csv = await r.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return null

    // Ligne de données : Symbol,Date,Time,Open,High,Low,Close,Volume,%Change
    const cols = lines[1].split(',').map(c => c.trim())
    if (cols.length < 7) return null

    const close = parseFloat(cols[6])
    const pct   = parseFloat(cols[8])

    if (isNaN(close) || close <= 0) return null // N/D = marché fermé ou symbole inconnu

    return {
      price:         Math.round(close * 100) / 100,
      changePercent: isNaN(pct) ? 0 : Math.round(pct * 100) / 100,
    }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // 12 requêtes en parallèle — Stooq ne supporte pas le batch CSV
    const results = await Promise.all(STOCKS.map(s => fetchOne(s.symbol)))

    const quotes = STOCKS.map((s, i) => {
      const q = results[i]
      if (!q) return null

      const prevClose = q.changePercent !== 0
        ? q.price / (1 + q.changePercent / 100)
        : q.price

      return {
        id:            s.id,
        symbol:        s.symbol,
        name:          s.name,
        price:         q.price,
        change:        Math.round((q.price - prevClose) * 100) / 100,
        changePercent: q.changePercent,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      'EUR',
        isOpen:        null,
      }
    }).filter(Boolean)

    console.log('[Quotes] OK —', quotes.length, '/', STOCKS.length, 'cotations')

    if (quotes.length === 0) {
      return res.status(200).json({
        quotes: [],
        count: 0,
        marketClosed: true,
        message: 'Marchés fermés — données disponibles en semaine 9h–17h30',
        timestamp: new Date().toISOString(),
      })
    }

    return res.status(200).json({ quotes, count: quotes.length, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[Quotes] ERREUR:', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
