/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP en temps réel via Twelve Data API.
 * Env requis : TWELVEDATA_API_KEY (gratuit sur twelvedata.com)
 * GET /api/quotes
 */

// Toutes les valeurs du site, groupées par exchange
const XPAR_STOCKS = [
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

const OTHER_STOCKS = [
  { symbol: 'COFB', exchange: 'XBRU', name: 'COFINIMMO',     id: 'bouygues-immo' },
  { symbol: 'BBY',  exchange: 'XLON', name: 'BALFOUR BEATTY', id: 'saint-gobain-uk' },
]

function parseQuote(q, meta) {
  if (!q || q.status === 'error' || !q.close) return null
  const price     = parseFloat(q.close)
  const prevClose = parseFloat(q.previous_close)
  if (isNaN(price) || isNaN(prevClose) || prevClose === 0) return null
  const change    = price - prevClose
  const changePct = (change / prevClose) * 100
  return {
    ...meta,
    price:         Math.round(price    * 100) / 100,
    change:        Math.round(change   * 100) / 100,
    changePercent: Math.round(changePct * 100) / 100,
    prevClose:     Math.round(prevClose * 100) / 100,
    currency:      q.currency ?? 'EUR',
    isOpen:        q.is_market_open ?? null,
  }
}

async function fetchGroup(stocks, exchange, apiKey) {
  const symbols = stocks.map(s => s.symbol).join(',')
  const url = `https://api.twelvedata.com/quote?symbol=${symbols}&exchange=${exchange}&apikey=${apiKey}`
  const res = await fetch(url, { headers: { 'User-Agent': 'BatiAnalyse/1.0' } })
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status} for ${exchange}`)
  const data = await res.json()

  return stocks.map(s => {
    // Si 1 seul symbole, la réponse est l'objet direct (pas un dict)
    const q = stocks.length === 1 ? data : data[s.symbol]
    return parseQuote(q, { id: s.id, symbol: s.symbol, name: s.name, exchange })
  }).filter(Boolean)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'TWELVEDATA_API_KEY manquant — ajoute la clé dans Vercel > Settings > Environment Variables',
      quotes: [],
    })
  }

  try {
    // Appels parallèles par exchange
    const [xparQuotes, otherResults] = await Promise.all([
      fetchGroup(XPAR_STOCKS, 'XPAR', apiKey),
      Promise.allSettled(
        OTHER_STOCKS.map(s => fetchGroup([s], s.exchange, apiKey))
      ),
    ])

    const otherQuotes = otherResults
      .flatMap(r => r.status === 'fulfilled' ? r.value : [])

    const quotes = [...xparQuotes, ...otherQuotes]

    return res.status(200).json({
      quotes,
      count: quotes.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Quotes]', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
