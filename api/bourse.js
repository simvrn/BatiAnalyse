export default async function handler(req, res) {
  // Lien Google Sheets forcé en TSV (Tab-Separated Values)
  const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRR2cgRaRml3H3RShMlZyoq_GBd1UNOd5JU0iB2jsHfnXtFtUMT-_-1Vm6z_loyrpXF2d8vvyCT7GX8/pub?output=tsv';

  try {
    const response = await fetch(tsvUrl);
    const text = await response.text();

    // Découpage par ligne
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const stockData = {};

    // On commence à i=1 pour ignorer la ligne d'en-tête (Colonne A, Colonne B...)
    for (let i = 1; i < lines.length; i++) {
      // Découpage par tabulation
      const columns = lines[i].split('\t');

      if (columns.length >= 3) {
        const symbol = columns[0].trim();

        const priceStr  = columns[1].replace(',', '.').trim();
        const changeStr = columns[2].replace(',', '.').trim();
        const price  = parseFloat(priceStr);
        const change = parseFloat(changeStr);

        if (symbol && !isNaN(price)) {
          // Colonne 4 : Capitalisation (peut être #N/A ou vide)
          let cap = null;
          if (columns[3]) {
            const capStr = columns[3].replace(',', '.').trim();
            const capVal = parseFloat(capStr);
            if (!isNaN(capVal)) cap = capVal;
          }

          // Colonne 5 : PER (peut être #N/A, vide ou le texte "Négatif")
          let per = null;
          if (columns[4]) {
            const perStr = columns[4].trim();
            if (perStr.toLowerCase() === 'négatif' || perStr.toLowerCase() === 'negatif') {
              per = 'Négatif';
            } else {
              const perVal = parseFloat(perStr.replace(',', '.'));
              if (!isNaN(perVal)) per = perVal;
            }
          }

          stockData[symbol] = {
            price,
            percent_change: !isNaN(change) ? change : 0,
            cap,
            per,
          };
        }
      }
    }

    // CACHE VERCEL : 5 minutes pour tenir les 5000 visiteurs
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    res.status(200).json({ success: true, data: stockData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lecture Google Sheets' });
  }
}
