/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via Yahoo Finance — Edge Runtime (Cloudflare, pas AWS).
 * Cache 30 min. Aucune clé API requise.
 * GET /api/quotes
 * GET /api/quotes?debug=1
 */

export const config = { runtime: 'edge' }

const SYMBOLS = [
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

export default async function handler(req) {
  const debug = (req.url || '').includes('debug=1')

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=1800, stale-while-revalidate=300',
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers })

  try {
    const tickers = SYMBOLS.map(s => s.yf).join(',')
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketPreviousClose,currency,marketState`

    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
    })

    if (!r.ok) throw new Error(`Yahoo Finance HTTP ${r.status}`)

    const data = await r.json()

    if (debug) {
      return new Response(JSON.stringify({ debug: data }, null, 2), { status: 200, headers })
    }

    const results = data?.quoteResponse?.result
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Yahoo Finance: réponse vide — ' + JSON.stringify(data).slice(0, 200))
    }

    const bySymbol = {}
    results.forEach(q => { bySymbol[q.symbol] = q })

    const quotes = SYMBOLS.map(s => {
      const q = bySymbol[s.yf]
      if (!q || !q.regularMarketPrice) return null

      const price     = q.regularMarketPrice
      const prevClose = q.regularMarketPreviousClose ?? price
      const changePct = q.regularMarketChangePercent ?? 0

      return {
        id:            s.id,
        symbol:        s.yf,
        name:          s.name,
        price:         Math.round(price * 100) / 100,
        change:        Math.round((q.regularMarketChange ?? 0) * 100) / 100,
        changePercent: Math.round(changePct * 100) / 100,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      q.currency ?? 'EUR',
        isOpen:        q.marketState === 'REGULAR',
      }
    }).filter(Boolean)

    if (quotes.length === 0) {
      throw new Error('Aucune cotation — symboles reçus : ' + Object.keys(bySymbol).join(', '))
    }

    return new Response(JSON.stringify({
      quotes,
      count: quotes.length,
      timestamp: new Date().toISOString(),
    }), { status: 200, headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, quotes: [] }), { status: 502, headers })
  }
}
