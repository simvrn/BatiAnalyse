/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via Financial Modeling Prep (nouveau endpoint /stable/quote).
 * Cache Vercel Edge 30 min → max 48 appels/jour (plan free = 250/jour).
 *
 * Env requis : API_FMP_Bourse (Vercel > Settings > Environment Variables)
 * GET /api/quotes
 * GET /api/quotes?debug=1  → réponse brute FMP pour diagnostic
 */

export const config = { runtime: 'edge' }

const STOCKS = [
  { symbol: 'VIE.PA',  name: 'VINCI',           id: 'vinci' },
  { symbol: 'FGR.PA',  name: 'EIFFAGE',         id: 'eiffage' },
  { symbol: 'EN.PA',   name: 'BOUYGUES',        id: 'bouygues' },
  { symbol: 'SGO.PA',  name: 'SAINT-GOBAIN',    id: 'saint-gobain' },
  { symbol: 'NXI.PA',  name: 'NEXITY',          id: 'nexity' },
  { symbol: 'KOF.PA',  name: 'KAUFMAN & BROAD', id: 'kaufman' },
  { symbol: 'LR.PA',   name: 'LEGRAND',         id: 'legrand' },
  { symbol: 'NK.PA',   name: 'IMERYS',          id: 'imerys' },
  { symbol: 'VCT.PA',  name: 'VICAT',           id: 'vicat' },
  { symbol: 'BA.PA',   name: 'BASSAC',          id: 'bassac' },
  { symbol: 'SPIE.PA', name: 'SPIE',            id: 'spie' },
  { symbol: 'SU.PA',   name: 'SCHNEIDER',       id: 'schneider' },
]

export default async function handler(req) {
  const debug = (req.url || '').includes('debug=1')

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=1800, stale-while-revalidate=300',
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers })

  const apiKey = process.env.API_FMP_Bourse
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'API_FMP_Bourse manquant — ajoute-la dans Vercel > Settings > Environment Variables',
      quotes: [],
    }), { status: 500, headers })
  }

  try {
    const symbols = STOCKS.map(s => s.symbol).join(',')
    // Nouveau endpoint FMP (l'ancien /api/v3/quote/ est supprimé sur le plan gratuit)
    const url = `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${apiKey}`

    const r = await fetch(url)
    if (!r.ok) throw new Error(`FMP HTTP ${r.status}`)

    const data = await r.json()

    // Mode debug : retourner la réponse brute FMP
    if (debug) {
      return new Response(JSON.stringify({ debug: data }, null, 2), { status: 200, headers })
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('FMP: réponse vide ou invalide — ' + JSON.stringify(data).slice(0, 150))
    }

    const bySymbol = {}
    data.forEach(q => { bySymbol[q.symbol] = q })

    const quotes = STOCKS.map(s => {
      const q = bySymbol[s.symbol]
      if (!q || !q.price) return null

      const price     = parseFloat(q.price)
      const prevClose = parseFloat(q.previousClose)
      if (isNaN(price) || isNaN(prevClose) || prevClose === 0) return null

      return {
        id:            s.id,
        symbol:        s.symbol,
        name:          s.name,
        price:         Math.round(price * 100) / 100,
        change:        Math.round((price - prevClose) * 100) / 100,
        changePercent: Math.round(parseFloat(q.changesPercentage) * 100) / 100,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      'EUR',
        isOpen:        q.isActivelyTrading ?? null,
      }
    }).filter(Boolean)

    if (quotes.length === 0) {
      throw new Error('Aucune cotation mappée — symboles FMP reçus : ' + Object.keys(bySymbol).join(', '))
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
