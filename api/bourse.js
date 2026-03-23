import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  const symbols = ['SU.PA', 'DG.PA', 'SGO.PA', 'LR.PA', 'EN.PA', 'FGR.PA', 'SPIE.PA', 'CS.PA'];

  try {
    // On interroge Yahoo pour toutes les actions en même temps
    const results = await Promise.all(symbols.map(sym => yahooFinance.quote(sym)));

    const stockData = {};
    results.forEach(stock => {
      if (stock) {
        stockData[stock.symbol] = {
          price: stock.regularMarketPrice,
          percent_change: stock.regularMarketChangePercent
        };
      }
    });

    // CACHE VERCEL : 10 minutes pour encaisser les 5000 visiteurs sans bannissement Yahoo
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');

    res.status(200).json({ success: true, data: stockData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur Yahoo Finance' });
  }
}
