export default async function handler(req, res) {
  const API_KEY = 'boAHXaXTQaWoCN7A3aXWa648wXmSGcH6';
  const symbols = 'SU.PA,DG.PA,SGO.PA,LR.PA,EN.PA,FGR.PA,SPIE.PA,CS.PA';

  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`);
    const data = await response.json();

    const stockData = {};

    // FMP renvoie un tableau d'objets. On le formate proprement.
    if (Array.isArray(data)) {
      data.forEach(stock => {
        stockData[stock.symbol] = {
          price: stock.price,
          percent_change: stock.changesPercentage
        };
      });
    }

    // CACHE VERCEL : 10 minutes (600 secondes).
    // CRITIQUE : Cela garantit max 144 requêtes/jour. On respecte la limite de 250/jour de FMP même avec 5000 visiteurs.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');

    res.status(200).json({ success: true, data: stockData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération via FMP' });
  }
}
