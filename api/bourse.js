export default async function handler(req, res) {
  // Les tickers de la bourse de Paris
  const symbols = 'SU.PA,DG.PA,SGO.PA,LR.PA,EN.PA,FGR.PA,SPIE.PA,CS.PA';
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const stockData = {};

    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(stock => {
        stockData[stock.symbol] = {
          price: stock.regularMarketPrice,
          percent_change: stock.regularMarketChangePercent
        };
      });
    }

    // CACHE VERCEL : 5 minutes pour tenir les 5000 visiteurs
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    res.status(200).json({ success: true, data: stockData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération via Yahoo' });
  }
}
