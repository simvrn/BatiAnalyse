// Lecture et mise en forme de /data/macro.json (généré chaque jour par scripts/maj_macro.py).
// Utilisé par la page Macro et le bloc « La conjoncture » de l'accueil.
// Aucun chiffre macro n'est écrit en dur dans le HTML : tout vient de ce fichier.
(function () {
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const TRIM = { 1: 'premier', 2: 'deuxième', 3: 'troisième', 4: 'quatrième' }
  const DECIMALES = { taux_bce: 2, permis_construire: 0, chomage_bit: 1 }
  const COURT = { taux_bce: 'Taux BCE', permis_construire: 'Permis de construire', chomage_bit: 'Chômage BIT' }

  const nombre = (v, d) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
  const signe = (v, d) => (v > 0 ? '+' : '') + nombre(v, d)

  // 'AAAA-MM-JJ' -> '16 septembre 2026' ; 'AAAA-MM' -> 'août 2026' ; 'AAAA-Qn' -> 'T2 2026'
  function date(iso, long) {
    let m
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso))) {
      const j = Number(m[3])
      return `${j === 1 ? '1er' : j} ${MOIS[Number(m[2]) - 1]} ${m[1]}`
    }
    if ((m = /^(\d{4})-(\d{2})$/.exec(iso))) return `${MOIS[Number(m[2]) - 1]} ${m[1]}`
    if ((m = /^(\d{4})-Q([1-4])$/.exec(iso))) return long ? `${TRIM[m[2]]} trimestre ${m[1]}` : `T${m[2]} ${m[1]}`
    return iso
  }

  function valeur(cle, v) {
    const i = DECIMALES[cle]
    return cle === 'permis_construire' ? nombre(v, 0) : nombre(v, i) + '%'
  }

  function periode(cle, ind) {
    if (cle === 'taux_bce') return `En vigueur depuis le ${date(ind.date_valeur)}`
    if (cle === 'permis_construire') return `Logements autorisés en ${date(ind.date_valeur)}, données CVS-CJO`
    return `${date(ind.date_valeur)}, France hors Mayotte, données CVS`
  }

  function variation(cle, ind) {
    const d = ind.derives || {}
    if (cle === 'taux_bce' && d.variation_pb != null) {
      return `${signe(d.variation_pb, 0)} pb par rapport au taux précédent (${valeur(cle, d.valeur_precedente)} depuis le ${date(d.date_precedente)})`
    }
    if (cle === 'permis_construire') {
      const parts = [`${signe(d.variation_mois_pct, 1)}% sur un mois`, `${nombre(d.cumul_12_mois, 0)} sur 12 mois`]
      if (d.ecart_moyenne_5_ans_pct != null) parts.push(`${signe(d.ecart_moyenne_5_ans_pct, 1)}% par rapport à la moyenne annuelle des 5 années précédentes`)
      return parts.join(', ')
    }
    if (cle === 'chomage_bit' && d.variation_trimestre_pt != null) {
      return `${signe(d.variation_trimestre_pt, 1)} point sur un trimestre`
    }
    return ''
  }

  async function charger(url) {
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const d = await r.json()
    const ind = d && d.indicateurs
    // Jamais de valeur vide affichée : un indicateur incomplet est écarté
    const ok = ind && ['taux_bce', 'permis_construire', 'chomage_bit'].every(k =>
      ind[k] && typeof ind[k].derniere_valeur === 'number' && ind[k].date_valeur && ind[k].date_publication)
    if (!ok) throw new Error('données incomplètes')
    return d
  }

  window.Macro = { charger, date, valeur, periode, variation, nombre, signe, COURT, ORDRE: ['taux_bce', 'permis_construire', 'chomage_bit'] }
})()
