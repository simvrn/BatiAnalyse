/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via Financial Modeling Prep (FMP).
 * 1 seul appel batch pour tout le site.
 * Cache Vercel Edge 30 min → max 48 appels/jour (plan free = 250/jour).
 *
 * Env requis : FMP_API_KEY (gratuit sur financialmodelingprep.com)
 * GET /api/quotes
 */

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache 30 min sur Vercel Edge — max 48 appels/jour (plan free = 250/jour)
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'FMP_API_KEY manquant — ajoute-la dans Vercel > Settings > Environment Variables',
      quotes: [],
    })
  }

  try {
    const symbols = STOCKS.map(s => s.symbol).join(',')
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${apiKey}`

    console.log('[Quotes] Appel FMP:', url.replace(apiKey, '***'))
    const r = await fetch(url)
    const rawText = await r.text()
    console.log('[Quotes] FMP status:', r.status, '| réponse (200 chars):', rawText.slice(0, 200))

    if (!r.ok) throw new Error(`FMP HTTP ${r.status}: ${rawText.slice(0, 100)}`)

    let data
    try { data = JSON.parse(rawText) } catch { throw new Error('FMP: réponse non-JSON — ' + rawText.slice(0, 100)) }

    // FMP retourne un tableau : [{ symbol: "VIE.PA", price: 125.80, changesPercentage: 1.24, ... }]
    if (!Array.isArray(data)) {
      throw new Error('FMP: format inattendu — ' + JSON.stringify(data).slice(0, 100))
    }
    if (data.length === 0) {
      throw new Error('FMP: aucune donnée pour ces symboles — le plan gratuit couvre-t-il les actions européennes ?')
    }

    // Indexer par symbol pour lookup rapide
    const bySymbol = {}
    data.forEach(q => { bySymbol[q.symbol] = q })

    const quotes = STOCKS.map(s => {
      const q = bySymbol[s.symbol]
      if (!q || !q.price) {
        console.warn('[Quotes] Symbole manquant:', s.symbol, '| reçus:', Object.keys(bySymbol).join(','))
        return null
      }

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

    if (quotes.length === 0) throw new Error('Aucune cotation mappée — symboles FMP reçus: ' + Object.keys(bySymbol).join(','))

    console.log('[Quotes] OK —', quotes.length, 'cotations')
    return res.status(200).json({ quotes, count: quotes.length, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[Quotes] ERREUR:', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
