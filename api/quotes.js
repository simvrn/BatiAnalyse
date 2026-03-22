/**
 * api/quotes.js — BatiAnalyse
 * Proxy Yahoo Finance pour récupérer les cours boursiers BTP en temps réel.
 * Évite les problèmes CORS côté client.
 *
 * GET /api/quotes
 * Retourne les cotations des principales valeurs BTP cotées à Paris.
 */

const SYMBOLS = [
  'VIE.PA',   // Vinci
  'FGR.PA',   // Eiffage
  'EN.PA',    // Bouygues
  'SGO.PA',   // Saint-Gobain
  'NXI.PA',   // Nexity
  'KOF.PA',   // Kaufman & Broad
  'LR.PA',    // Legrand
  'NK.PA',    // Imerys
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS.join(',')}&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    })

    if (!response.ok) {
      throw new Error(`Yahoo Finance error: ${response.status}`)
    }

    const data = await response.json()
    const quotes = data?.quoteResponse?.result ?? []

    const result = quotes.map(q => ({
      symbol: q.symbol,
      name: q.shortName ?? q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      prevClose: q.regularMarketPreviousClose,
    }))

    return res.status(200).json({ quotes: result, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[Quotes] Erreur:', error.message)
    // Retourne des données statiques en fallback pour ne pas casser le ticker
    return res.status(200).json({
      quotes: [],
      error: error.message,
      fallback: true,
      timestamp: new Date().toISOString(),
    })
  }
}
