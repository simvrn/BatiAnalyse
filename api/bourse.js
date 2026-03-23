export default async function handler(req, res) {
  const API_KEY = 'd70polhr01ql6rg077fgd70polhr01ql6rg077g0';
  // Les tickers de mon tableau (Bourse de Paris)
  const symbols = ['SU.PA', 'DG.PA', 'SGO.PA', 'LR.PA', 'EN.PA', 'FGR.PA', 'SPIE.PA', 'CS.PA'];

  try {
    const fetchPromises = symbols.map(symbol =>
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`).then(r => r.json())
    );

    const results = await Promise.all(fetchPromises);

    const stockData = {};
    symbols.forEach((symbol, index) => {
      // Finnhub renvoie 'c' pour le prix, 'dp' pour la variation en %
      stockData[symbol] = {
        price: results[index].c,
        percent_change: results[index].dp
      };
    });

    // CACHE VERCEL : 5 minutes pour tenir les 5000 visiteurs
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    res.status(200).json({ success: true, data: stockData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données' });
  }
}
