/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via Twelve Data — 1 seul appel batch pour tout le site.
 * Cache Vercel Edge 30 min → max 48 appels/jour × 12 crédits = 576/800 (plan free).
 *
 * Env requis : TWELVEDATA_API_KEY (gratuit sur twelvedata.com)
 * GET /api/quotes
 * GET /api/quotes?debug=1  → réponse brute Twelve Data pour diagnostic
 */

export const config = { runtime: 'edge' }

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

export default async function handler(req) {
  const debug = (req.url || '').includes('debug=1')

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=1800, stale-while-revalidate=300',
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers })

  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'TWELVEDATA_API_KEY manquant — ajoute-la dans Vercel > Settings > Environment Variables',
      quotes: [],
    }), { status: 500, headers })
  }

  try {
    const symbols = STOCKS.map(s => s.symbol).join(',')
    const url = `https://api.twelvedata.com/quote?symbol=${symbols}&exchange=XPAR&apikey=${apiKey}`

    const r = await fetch(url)
    if (!r.ok) throw new Error(`Twelve Data HTTP ${r.status}`)

    const data = await r.json()

    // Mode debug : retourner la réponse brute pour diagnostic
    if (debug) {
      return new Response(JSON.stringify({ debug: data }, null, 2), { status: 200, headers })
    }

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
        price:         Math.round(price * 100) / 100,
        change:        Math.round((price - prevClose) * 100) / 100,
        changePercent: Math.round(changePct * 100) / 100,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      q.currency ?? 'EUR',
        isOpen:        q.is_market_open ?? null,
      }
    }).filter(Boolean)

    if (quotes.length === 0) {
      // Twelve Data retourne des données même marché fermé — si vide, erreur de symboles
      return new Response(JSON.stringify({
        error: 'Aucune cotation retournée — vérifie les symboles ou la clé API',
        quotes: [],
      }), { status: 502, headers })
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
