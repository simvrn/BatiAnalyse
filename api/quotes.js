/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP en temps réel via Twelve Data API.
 * Twelve Data supporte Euronext Paris et n'est pas bloqué par Vercel.
 *
 * Env requis : TWELVEDATA_API_KEY (gratuit sur twelvedata.com)
 *
 * GET /api/quotes
 */

const SYMBOLS = [
  { symbol: 'VIE',  name: 'VINCI' },
  { symbol: 'FGR',  name: 'EIFFAGE' },
  { symbol: 'EN',   name: 'BOUYGUES' },
  { symbol: 'SGO',  name: 'SAINT-GOBAIN' },
  { symbol: 'NXI',  name: 'NEXITY' },
  { symbol: 'KOF',  name: 'KAUFMAN & BROAD' },
  { symbol: 'LR',   name: 'LEGRAND' },
  { symbol: 'NK',   name: 'IMERYS' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache 5 min sur Vercel Edge — toutes les visites partagent la même réponse
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'TWELVEDATA_API_KEY manquant dans les variables Vercel' })
  }

  try {
    // Batch request — tous les symboles en 1 seul appel (8 crédits)
    const symbolsList = SYMBOLS.map(s => s.symbol).join(',')
    const url = `https://api.twelvedata.com/quote?symbol=${symbolsList}&exchange=XPAR&apikey=${apiKey}`

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`)

    const data = await response.json()

    // Réponse batch : { VIE: {...}, FGR: {...}, ... }
    // Si 1 seul symbole, la réponse est directement l'objet (pas un dict)
    const quotes = SYMBOLS.map(s => {
      const q = Array.isArray(data) ? null : (Object.keys(SYMBOLS).length === 1 ? data : data[s.symbol])
      if (!q || q.status === 'error' || !q.close) return null

      const price      = parseFloat(q.close)
      const prevClose  = parseFloat(q.previous_close)
      const change     = price - prevClose
      const changePct  = prevClose ? (change / prevClose) * 100 : 0

      return {
        symbol:        s.symbol,
        name:          s.name,
        price:         Math.round(price   * 100) / 100,
        change:        Math.round(change  * 100) / 100,
        changePercent: Math.round(changePct * 100) / 100,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      q.currency ?? 'EUR',
      }
    }).filter(Boolean)

    if (quotes.length === 0) {
      throw new Error('Aucune cotation retournée par Twelve Data')
    }

    return res.status(200).json({ quotes, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[Quotes] Erreur:', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
