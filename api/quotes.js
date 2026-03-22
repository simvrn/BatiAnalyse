/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via Twelve Data — 1 seul appel API pour tout le site.
 * Cache Vercel Edge 25 minutes → max ~57 appels/jour = 684 crédits (plan free = 800/jour).
 *
 * Env requis : TWELVEDATA_API_KEY (gratuit sur twelvedata.com)
 * GET /api/quotes
 */

// Uniquement les valeurs Euronext Paris — 1 seul batch = 12 crédits / 10 min
const STOCKS = [
  { symbol: 'VIE',  name: 'VINCI',           id: 'vinci' },
  { symbol: 'FGR',  name: 'EIFFAGE',         id: 'eiffage' },
  { symbol: 'EN',   name: 'BOUYGUES',        id: 'bouygues' },
  { symbol: 'SGO',  name: 'SAINT-GOBAIN',    id: 'saint-gobain' },
  { symbol: 'NXI',  name: 'NEXITY',          id: 'nexity' },
  { symbol: 'KOF',  name: 'KAUFMAN & BROAD', id: 'kaufman' },
  { symbol: 'LR',   name: 'LEGRAND',         id: 'legrand' },
  { symbol: 'NK',   name: 'IMERYS',          id: 'imerys' },
  { symbol: 'VCT',  name: 'VICAT',           id: 'vicat' },
  { symbol: 'BA',   name: 'BASSAC',          id: 'bassac' },
  { symbol: 'SPIE', name: 'SPIE',            id: 'spie' },
  { symbol: 'SU',   name: 'SCHNEIDER',       id: 'schneider' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache 25 min sur Vercel Edge — toutes les visites partagent la réponse
  // Max ~57 appels/jour × 12 crédits = 684 crédits/jour (plan free = 800/jour)
  res.setHeader('Cache-Control', 's-maxage=1500, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'TWELVEDATA_API_KEY manquant — ajoute-la dans Vercel > Settings > Environment Variables',
      quotes: [],
    })
  }

  try {
    // 1 seul appel pour toutes les valeurs XPAR
    const symbols = STOCKS.map(s => s.symbol).join(',')
    const url = `https://api.twelvedata.com/quote?symbol=${symbols}&exchange=XPAR&apikey=${apiKey}`

    const res2 = await fetch(url)
    if (!res2.ok) throw new Error(`Twelve Data HTTP ${res2.status}`)

    const data = await res2.json()

    // Twelve Data retourne { VIE: {...}, FGR: {...}, ... } pour un batch
    const quotes = STOCKS.map(s => {
      const q = data[s.symbol]
      if (!q || q.status === 'error' || !q.close) return null

      const price     = parseFloat(q.close)
      const prevClose = parseFloat(q.previous_close)
      if (isNaN(price) || isNaN(prevClose) || prevClose === 0) return null

      const changePct = ((price - prevClose) / prevClose) * 100

      return {
        id:            s.id,
        symbol:        s.symbol,
        name:          s.name,
        price:         Math.round(price    * 100) / 100,
        change:        Math.round(price - prevClose) * 100 / 100,
        changePercent: Math.round(changePct * 100) / 100,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      q.currency ?? 'EUR',
        isOpen:        q.is_market_open ?? null,
      }
    }).filter(Boolean)

    if (quotes.length === 0) throw new Error('Aucune cotation retournée — vérifie les symboles Twelve Data')

    return res.status(200).json({ quotes, count: quotes.length, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[Quotes]', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
