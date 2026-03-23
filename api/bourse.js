import yahooFinance from 'yahoo-finance2'

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
