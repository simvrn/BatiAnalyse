/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP en temps réel via Yahoo Finance v8/chart.
 * Plus fiable que v7 : pas de crumb nécessaire, données fraîches.
 *
 * GET /api/quotes
 */

const SYMBOLS = [
  { symbol: 'VIE.PA',  name: 'VINCI' },
  { symbol: 'FGR.PA',  name: 'EIFFAGE' },
  { symbol: 'EN.PA',   name: 'BOUYGUES' },
  { symbol: 'SGO.PA',  name: 'SAINT-GOBAIN' },
  { symbol: 'NXI.PA',  name: 'NEXITY' },
  { symbol: 'KOF.PA',  name: 'KAUFMAN & BROAD' },
  { symbol: 'LR.PA',   name: 'LEGRAND' },
  { symbol: 'NK.PA',   name: 'IMERYS' },
]

async function fetchQuote({ symbol, name }) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d&includePrePost=false`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com',
    },
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`)

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)

  const meta = result.meta
  const price = meta.regularMarketPrice
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose

  if (!price || !prevClose) throw new Error(`Missing price for ${symbol}`)

  const change = price - prevClose
  const changePercent = (change / prevClose) * 100

  return {
    symbol,
    name,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    prevClose: Math.round(prevClose * 100) / 100,
    currency: meta.currency ?? 'EUR',
    marketState: meta.marketState ?? 'UNKNOWN',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache 2 minutes sur Vercel Edge, 30s stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=30')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const results = await Promise.allSettled(SYMBOLS.map(fetchQuote))

  const quotes = results
    .map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      console.warn(`[Quotes] ${SYMBOLS[i].symbol} échec:`, r.reason?.message)
      return null
    })
    .filter(Boolean)

  if (quotes.length === 0) {
    return res.status(502).json({ error: 'Impossible de récupérer les cours', quotes: [] })
  }

  return res.status(200).json({
    quotes,
    count: quotes.length,
    timestamp: new Date().toISOString(),
  })
}
