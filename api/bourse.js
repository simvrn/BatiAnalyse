export default async function handler(req, res) {
  // Lien Google Sheets forcé en TSV (Tab-Separated Values)
  const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRR2cgRaRml3H3RShMlZyoq_GBd1UNOd5JU0iB2jsHfnXtFtUMT-_-1Vm6z_loyrpXF2d8vvyCT7GX8/pub?output=tsv';

  // Helper : parse un float depuis une cellule (virgule ou point, vide ou #N/A → null)
  function parseNum(str) {
    if (!str) return null;
    const s = str.replace(',', '.').trim();
    if (s === '' || s.startsWith('#')) return null;
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  }

  try {
    const response = await fetch(tsvUrl);
    const text = await response.text();

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const stockData = {};

    // Colonnes attendues dans le Google Sheet :
    // A  (0) : Symbole ticker (ex. DG.PA)
    // B  (1) : Cours (prix actuel)
    // C  (2) : Variation % du jour
    // D  (3) : Capitalisation boursière (en €)
    // E  (4) : P/E ratio (ou "Négatif")
    // F  (5) : CA annuel (en Md€, ex. 74.6)
    // G  (6) : EBIT (en Md€)
    // H  (7) : Résultat net (en Md€)
    // I  (8) : Rendement dividende (en %, ex. 3.2)
    // J  (9) : Performance 1 an (en %, ex. -8.4)

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split('\t');
      if (columns.length < 3) continue;

      const symbol = columns[0].trim();
      const price  = parseNum(columns[1]);
      const change = parseNum(columns[2]);

      if (!symbol || price === null) continue;

      // Colonne D : Capitalisation
      const cap = parseNum(columns[3]);

      // Colonne E : PER (texte possible "Négatif")
      let per = null;
      if (columns[4]) {
        const perStr = columns[4].trim();
        if (perStr.toLowerCase() === 'négatif' || perStr.toLowerCase() === 'negatif') {
          per = 'Négatif';
        } else {
          per = parseNum(columns[4]);
        }
      }

      // Colonnes financières (F–J)
      const ca          = parseNum(columns[5]);   // CA en Md€
      const ebit        = parseNum(columns[6]);   // EBIT en Md€
      const net         = parseNum(columns[7]);   // Résultat net en Md€
      const rendement   = parseNum(columns[8]);   // Rendement div. en %
      const perf_1an    = parseNum(columns[9]);   // Performance 1 an en %

      stockData[symbol] = {
        price,
        percent_change: change ?? 0,
        cap,
        per,
        ca,
        ebit,
        net,
        rendement,
        perf_1an,
      };
    }

    // CACHE VERCEL : 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ success: true, data: stockData });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lecture Google Sheets' });
  }
}
