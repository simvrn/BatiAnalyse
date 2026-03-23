// Test ultra-simple yahoo-finance2 — équivalent du app/api/bourse/route.js Next.js
// Pas d'Edge Runtime — Node.js pur

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const yahooFinance = require('yahoo-finance2').default

export default async function handler(req, res) {
  try {
    const data = await yahooFinance.quote('CS.PA')

    return res.status(200).json({
      success: true,
      name:     data.shortName,
      price:    data.regularMarketPrice,
      currency: data.currency,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
