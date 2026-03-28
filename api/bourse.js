export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRR2cgRaRml3H3RShMlZyoq_GBd1UNOd5JU0iB2jsHfnXtFtUMT-_-1Vm6z_loyrpXF2d8vvyCT7GX8/pub?output=tsv'

  // Mapping Google Finance symbols → tickers standard utilisés sur le site
  const SYMBOL_MAP = {
    'EPA:SU':   'SU.PA',
    'EPA:DG':   'DG.PA',
    'EPA:SGO':  'SGO.PA',
    'EPA:LR':   'LR.PA',
    'EPA:EN':   'EN.PA',
    'EPA:FGR':  'FGR.PA',
    'EPA:SPIE': 'SPIE.PA',
    'LON:BALI': 'BBY.L',
    'LON:BBY':  'BBY.L',
    'EBR:COFB': 'COFB.BR',
    'EPA:NK':   'NK.PA',
    'EPA:VCT':  'VCT.PA',
    'EPA:NXI':  'NXI.PA',
    'EPA:KOF':  'KOF.PA',
    'EPA:BA':   'BA.PA',
  }

  // Colonnes réelles du Google Sheet (0-indexed) :
  // 0  : Symbole (format Google Finance, ex. EPA:DG)
  // 1  : Prix actuel
  // 2  : Variation % du jour
  // 3  : Capitalisation boursière (€ bruts)
  // 4  : P/E ratio (nombre ou "Négatif")
  // 5  : Plus haut 52 semaines
  // 6  : Plus bas 52 semaines
  // 7  : Volume du jour
  // 8  : BPA / EPS
  // 9  : Plus bas 1 an (doublon)
  // 10 : Mini graphique (vide)
  // 11 : Plus haut 52 sem (doublon)
  // 12 : Prix il y a 52 semaines
  // 13 : Performance sur 1 an (%)

  function parseNum(str) {
    if (!str) return null
    const s = str.replace(',', '.').trim()
    if (s === '' || s.startsWith('#') || s === '0') return null
    const v = parseFloat(s)
    return isNaN(v) ? null : v
  }

  function parsePER(str) {
    if (!str) return null
    const s = str.trim()
    if (s.toLowerCase() === 'négatif' || s.toLowerCase() === 'negatif') return 'Négatif'
    if (!s || s.startsWith('#') || s === '0') return null
    const v = parseFloat(s.replace(',', '.'))
    return isNaN(v) ? null : v
  }

  try {
    const response = await fetch(tsvUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()

    const lines = text.split('\n').filter(l => l.trim() !== '')
    const stockData = {}

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t')
      if (cols.length < 2) continue

      const googleSymbol = cols[0].trim()
      const ticker = SYMBOL_MAP[googleSymbol]
      if (!ticker) continue  // symbole inconnu (ex. NASDAQ:AAPL)

      const price = parseNum(cols[1])
      if (!price) continue

      stockData[ticker] = {
        price,
        percent_change: parseNum(cols[2]) ?? 0,
        cap:     parseNum(cols[3]),
        per:     parsePER(cols[4]),
        high52w: parseNum(cols[5]),
        low52w:  parseNum(cols[6]),
        volume:  parseNum(cols[7]),
        eps:     parseNum(cols[8]),
        perf_1an: parseNum(cols[13]),
      }
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    res.status(200).json({ success: true, data: stockData })

  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lecture Google Sheets: ' + error.message })
  }
}
