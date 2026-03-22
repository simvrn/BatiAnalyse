/**
 * api/quotes.js — BatiAnalyse
 * Cours boursiers BTP via Stooq — gratuit, sans clé API, sans limite.
 * Cache Vercel Edge 30 min → max 48 appels/jour.
 *
 * Aucune variable d'environnement requise.
 * GET /api/quotes
 */

const STOCKS = [
  { symbol: 'vie.pa',  name: 'VINCI',           id: 'vinci' },
  { symbol: 'fgr.pa',  name: 'EIFFAGE',         id: 'eiffage' },
  { symbol: 'en.pa',   name: 'BOUYGUES',        id: 'bouygues' },
  { symbol: 'sgo.pa',  name: 'SAINT-GOBAIN',    id: 'saint-gobain' },
  { symbol: 'nxi.pa',  name: 'NEXITY',          id: 'nexity' },
  { symbol: 'kof.pa',  name: 'KAUFMAN & BROAD', id: 'kaufman' },
  { symbol: 'lr.pa',   name: 'LEGRAND',         id: 'legrand' },
  { symbol: 'nk.pa',   name: 'IMERYS',          id: 'imerys' },
  { symbol: 'vct.pa',  name: 'VICAT',           id: 'vicat' },
  { symbol: 'ba.pa',   name: 'BASSAC',          id: 'bassac' },
  { symbol: 'spie.pa', name: 'SPIE',            id: 'spie' },
  { symbol: 'su.pa',   name: 'SCHNEIDER',       id: 'schneider' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache 30 min sur Vercel Edge — aucune limite Stooq à respecter
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const symbols = STOCKS.map(s => s.symbol).join(',')
    // f=sd2t2ohlcvp : Symbol, Date, Time, Open, High, Low, Close, Volume, %Change
    const url = `https://stooq.com/q/l/?s=${symbols}&f=sd2t2ohlcvp&h&e=csv`

    console.log('[Quotes] Appel Stooq pour', STOCKS.length, 'symboles')

    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BatiAnalyse/1.0; +https://batianalyse.fr)' },
    })
    if (!r.ok) throw new Error(`Stooq HTTP ${r.status}`)

    const csv = await r.text()
    console.log('[Quotes] Stooq réponse (300 chars):', csv.slice(0, 300))

    const lines = csv.trim().split('\n')
    if (lines.length < 2) throw new Error('Stooq: CSV vide ou sans données')

    // Colonnes : Symbol(0), Date(1), Time(2), Open(3), High(4), Low(5), Close(6), Volume(7), %Change(8)
    const bySymbol = {}
    lines.slice(1).forEach(line => {
      const cols = line.split(',').map(c => c.trim())
      if (cols.length < 7) return
      const sym   = cols[0].toLowerCase()
      const close = parseFloat(cols[6])
      const pct   = cols[8] !== undefined ? parseFloat(cols[8]) : NaN
      if (!isNaN(close) && close > 0) bySymbol[sym] = { close, pct }
    })

    console.log('[Quotes] Symboles reçus:', Object.keys(bySymbol).join(', '))

    const quotes = STOCKS.map(s => {
      const q = bySymbol[s.symbol]
      if (!q) {
        console.warn('[Quotes] Manquant:', s.symbol)
        return null
      }

      const changePct = isNaN(q.pct) ? 0 : q.pct
      const prevClose = changePct !== 0 ? q.close / (1 + changePct / 100) : q.close

      return {
        id:            s.id,
        symbol:        s.symbol,
        name:          s.name,
        price:         Math.round(q.close  * 100) / 100,
        change:        Math.round((q.close - prevClose) * 100) / 100,
        changePercent: Math.round(changePct * 100) / 100,
        prevClose:     Math.round(prevClose * 100) / 100,
        currency:      'EUR',
        isOpen:        null,
      }
    }).filter(Boolean)

    if (quotes.length === 0) {
      throw new Error('Aucune cotation valide — symboles Stooq reçus: ' + Object.keys(bySymbol).join(','))
    }

    console.log('[Quotes] OK —', quotes.length, '/', STOCKS.length, 'cotations')
    return res.status(200).json({ quotes, count: quotes.length, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[Quotes] ERREUR:', error.message)
    return res.status(502).json({ error: error.message, quotes: [] })
  }
}
