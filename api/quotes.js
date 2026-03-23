/**
 * api/quotes.js — BatiAnalyse
 * Ticker homepage — Finnhub, fetch natif, cache 5 min Vercel.
 */

const API_KEY = 'd70polhr01ql6rg077fgd70polhr01ql6rg077g0'

const STOCKS = [
  { symbol: 'DG.PA',   name: 'VINCI',        id: 'vinci' },
  { symbol: 'FGR.PA',  name: 'EIFFAGE',      id: 'eiffage' },
  { symbol: 'EN.PA',   name: 'BOUYGUES',     id: 'bouygues' },
  { symbol: 'SGO.PA',  name: 'SAINT-GOBAIN', id: 'saint-gobain' },
  { symbol: 'LR.PA',   name: 'LEGRAND',      id: 'legrand' },
  { symbol: 'SPIE.PA', name: 'SPIE',         id: 'spie' },
  { symbol: 'SU.PA',   name: 'SCHNEIDER',    id: 'schneider' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const results = await Promise.all(
      STOCKS.map(s =>
        fetch(`https://finnhub.io/api/v1/quote?symbol=${s.symbol}&token=${API_KEY}`)
          .then(r => r.json())
          .catch(() => null)
      )
    )

    const quotes = STOCKS.map((s, i) => {
      const q = results[i]
      if (!q || !q.c || q.c === 0) return null
      return {
        id:            s.id,
        symbol:        s.symbol,
        name:          s.name,
        price:         Math.round(q.c  * 100) / 100,
        change:        Math.round((q.d  ?? 0) * 100) / 100,
        changePercent: Math.round((q.dp ?? 0) * 100) / 100,
        prevClose:     Math.round((q.pc ?? 0) * 100) / 100,
        currency:      'EUR',
        isOpen:        null,
      }
    }).filter(Boolean)

    return res.status(200).json({ quotes, count: quotes.length, timestamp: new Date().toISOString() })

  } catch (error) {
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
