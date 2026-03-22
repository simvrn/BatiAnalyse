/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP en temps réel via Twelve Data API.
 * Couvre toutes les valeurs de la page Valeurs Cotées + le ticker de la home.
 *
 * Env requis : TWELVEDATA_API_KEY (gratuit sur twelvedata.com)
 * GET /api/quotes
 */

// Toutes les valeurs du site, regroupées par place de cotation
const STOCKS = [
  // ── Euronext Paris ──
  { symbol: 'VIE',  exchange: 'XPAR', name: 'VINCI',            id: 'vinci' },
  { symbol: 'FGR',  exchange: 'XPAR', name: 'EIFFAGE',          id: 'eiffage' },
  { symbol: 'EN',   exchange: 'XPAR', name: 'BOUYGUES',         id: 'bouygues' },
  { symbol: 'SGO',  exchange: 'XPAR', name: 'SAINT-GOBAIN',     id: 'saint-gobain' },
  { symbol: 'NXI',  exchange: 'XPAR', name: 'NEXITY',           id: 'nexity' },
  { symbol: 'KOF',  exchange: 'XPAR', name: 'KAUFMAN & BROAD',  id: 'kaufman' },
  { symbol: 'LR',   exchange: 'XPAR', name: 'LEGRAND',          id: 'legrand' },
  { symbol: 'NK',   exchange: 'XPAR', name: 'IMERYS',           id: 'imerys' },
  { symbol: 'VCT',  exchange: 'XPAR', name: 'VICAT',            id: 'vicat' },
  { symbol: 'BA',   exchange: 'XPAR', name: 'BASSAC',           id: 'bassac' },
  { symbol: 'SPIE', exchange: 'XPAR', name: 'SPIE',             id: 'spie' },
  { symbol: 'SU',   exchange: 'XPAR', name: 'SCHNEIDER',        id: 'schneider' },
  // ── Euronext Bruxelles ──
  { symbol: 'COFB', exchange: 'XBRU', name: 'COFINIMMO',        id: 'bouygues-immo' },
  // ── London Stock Exchange ──
  { symbol: 'BBY',  exchange: 'XLON', name: 'BALFOUR BEATTY',   id: 'saint-gobain-uk' },
]

async function fetchBatch(stocks, apiKey) {
  // Twelve Data supporte les appels mixtes : symbol=VIE:XPAR,BBY:XLON
  const symbolsParam = stocks.map(s => `${s.symbol}:${s.exchange}`).join(',')
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolsParam)}&apikey=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`)
  return res.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache 5 min sur Vercel Edge
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'TWELVEDATA_API_KEY manquant dans les variables Vercel' })
  }

  try {
    const data = await fetchBatch(STOCKS, apiKey)

    const quotes = STOCKS.map(s => {
      // Twelve Data : si 1 seul symbole la réponse est directe, sinon c'est un dict
      const key = `${s.symbol}:${s.exchange}`
      const q = data[key] ?? data[s.symbol]

      if (!q || q.status === 'error' || !q.close) return null

      const price     = parseFloat(q.close)
      const prevClose = parseFloat(q.previous_close)
      if (isNaN(price) || isNaN(prevClose) || prevClose === 0) return null

      const change    = price - prevClose
      const changePct = (change / prevClose) * 100

      return {
        id:            s.id,
        symbol:        s.symbol,
        name:          s.name,
        price:         Math.round(price   * 100) / 100,
        change:        Math.round(change  * 100) / 100,
        changePercent: Math.round(changePct * 100) / 100,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      q.currency ?? 'EUR',
        exchange:      s.exchange,
        isOpen:        q.is_market_open ?? null,
      }
    }).filter(Boolean)

    if (quotes.length === 0) throw new Error('Aucune cotation retournée')

    return res.status(200).json({ quotes, count: quotes.length, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[Quotes]', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
