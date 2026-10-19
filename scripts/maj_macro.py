#!/usr/bin/env python3
"""Met à jour public/data/macro.json avec les 3 indicateurs macro du site.

Sources officielles, sans clé d'API :
  - Taux de dépôt BCE : API de données de la BCE, série FM.D.U2.EUR.4F.KR.DFR.LEV
  - Permis de construire : SDES (DiDo), logements autorisés, France, CVS-CJO
  - Chômage BIT : INSEE, API BDM, série 001688527

Garde-fous : si une source est indisponible ou renvoie une valeur absurde,
l'indicateur garde ses dernières données valides et le script sort en erreur
(code 1) pour que l'exécution programmée échoue de façon visible.
Le fichier n'est réécrit que si les données ont changé.

Usage : python3 scripts/maj_macro.py
"""
import csv
import datetime as dt
import email.utils
import io
import json
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'public' / 'data' / 'macro.json'
AUJOURDHUI = dt.date.today().isoformat()

BCE_URL = 'https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?format=csvdata&detail=dataonly'
BCE_PAGE = 'https://data.ecb.europa.eu/data/datasets/FM/FM.D.U2.EUR.4F.KR.DFR.LEV'
SDES_DATASET = '6513eed03b05e5cd969c2710'
SDES_API = 'https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1'
SDES_PAGE = f'https://www.statistiques.developpement-durable.gouv.fr/catalogue?page=dataset&datasetId={SDES_DATASET}'
INSEE_SERIE = '001688527'
INSEE_URL = f'https://api.insee.fr/series/BDM/data/SERIES_BDM/{INSEE_SERIE}'
INSEE_PAGE = f'https://www.insee.fr/fr/statistiques/serie/{INSEE_SERIE}'

# Plages plausibles : une valeur hors plage est considérée comme absurde
PLAGES = {
    'taux_bce': (-1.0, 10.0),
    'permis_construire': (5000, 80000),
    'chomage_bit': (3.0, 20.0),
}


def telecharger(url, essais=3):
    """Renvoie (contenu, en-têtes). Réessaie en cas d'erreur réseau."""
    derniere = None
    for i in range(essais):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'BatiAnalyse-maj-macro/1.0'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read(), r.headers
        except Exception as e:  # réseau, HTTP 5xx, délai dépassé
            derniere = e
            time.sleep(5 * (i + 1))
    raise RuntimeError(f'source indisponible ({url}) : {derniere}')


def taux_bce():
    contenu, entetes = telecharger(BCE_URL)
    lignes = list(csv.DictReader(io.StringIO(contenu.decode('utf-8'))))
    # La série est quotidienne : on ne garde que les dates de changement de taux,
    # ce qui conserve tout l'historique sans perte d'information.
    historique, precedente = [], None
    for l in lignes:
        if not l.get('OBS_VALUE'):
            continue
        v = float(l['OBS_VALUE'])
        if v != precedente:
            historique.append({'date': l['TIME_PERIOD'], 'valeur': v})
            precedente = v
    modif = entetes.get('Last-Modified')
    date_pub = email.utils.parsedate_to_datetime(modif).date().isoformat() if modif else None
    dernier, avant = historique[-1], historique[-2] if len(historique) > 1 else None
    return {
        'libelle': 'Taux de dépôt de la BCE',
        'unite': '%',
        'frequence': 'à chaque décision',
        'derniere_valeur': dernier['valeur'],
        'date_valeur': dernier['date'],
        'date_publication': date_pub,
        'source_nom': 'Banque centrale européenne',
        'source_url': BCE_PAGE,
        'source_api': BCE_URL,
        'serie_id': 'FM.D.U2.EUR.4F.KR.DFR.LEV',
        'note_historique': "Dates d'entrée en vigueur de chaque changement de taux, depuis 1999.",
        'derives': {
            'variation_pb': round((dernier['valeur'] - avant['valeur']) * 100) if avant else None,
            'valeur_precedente': avant['valeur'] if avant else None,
            'date_precedente': avant['date'] if avant else None,
            'methode': 'Écart en points de base avec le taux précédent.',
        },
        'historique': historique,
    }


def permis_construire():
    meta, _ = telecharger(f'{SDES_API}/datasets/{SDES_DATASET}')
    meta = json.loads(meta)
    fichier = next(f for f in meta['datafiles'] if 'nationales' in f['title'].lower())
    millesime = max(fichier['millesimes'], key=lambda m: m['millesime'])
    url = (f"{SDES_API}/datafiles/{fichier['rid']}/csv?millesime={millesime['millesime']}"
           '&withColumnName=true&withColumnDescription=false')
    contenu, _ = telecharger(url)
    lecteur = csv.DictReader(io.StringIO(contenu.decode('utf-8-sig')), delimiter=';')
    mois = {}
    for l in lecteur:
        if l['TYPE_LGT'] == 'Tous Logements' and l['NAT_SERIES'] == 'CVS-CJO' and l['LOG_AUT']:
            mois[f"{l['ANNEE']}-{l['MOIS']}"] = int(l['LOG_AUT'])
    historique = [{'date': k, 'valeur': mois[k]} for k in sorted(mois)]
    vals = [h['valeur'] for h in historique]
    cumul_12 = sum(vals[-12:])
    moyenne_5_ans = sum(vals[-72:-12]) / 5 if len(vals) >= 72 else None
    return {
        'libelle': 'Permis de construire, logements autorisés',
        'unite': 'logements',
        'frequence': 'mensuelle',
        'derniere_valeur': vals[-1],
        'date_valeur': historique[-1]['date'],
        'date_publication': millesime['date_diffusion'][:10],
        'source_nom': 'SDES, ministère de la Transition écologique (Sitadel)',
        'source_url': meta.get('weburl') or SDES_PAGE,
        'source_api': url,
        'serie_id': f"{SDES_DATASET} / {fichier['rid']} / Tous logements / CVS-CJO",
        'note_historique': 'Logements autorisés par mois, France, données corrigées des variations saisonnières et des jours ouvrés.',
        'derives': {
            'variation_mois_pct': round((vals[-1] / vals[-2] - 1) * 100, 1),
            'cumul_12_mois': cumul_12,
            'ecart_moyenne_5_ans_pct': round((cumul_12 / moyenne_5_ans - 1) * 100, 1) if moyenne_5_ans else None,
            'methode': ('Variation sur un mois en données CVS-CJO. Cumul des 12 derniers mois. '
                        'Écart du cumul 12 mois avec la moyenne annuelle des 60 mois précédents.'),
        },
        'historique': historique,
    }


def chomage_bit():
    contenu, _ = telecharger(INSEE_URL)
    racine = ET.fromstring(contenu)
    serie = next(e for e in racine.iter() if e.tag.endswith('Series'))
    obs = [e for e in serie if e.tag.endswith('Obs') and e.get('OBS_VALUE')]
    historique = sorted(({'date': o.get('TIME_PERIOD'), 'valeur': float(o.get('OBS_VALUE'))} for o in obs),
                        key=lambda h: h['date'])
    dernier, avant = historique[-1], historique[-2]
    return {
        'libelle': 'Taux de chômage au sens du BIT',
        'unite': '%',
        'frequence': 'trimestrielle',
        'derniere_valeur': dernier['valeur'],
        'date_valeur': dernier['date'],
        'date_publication': serie.get('LAST_UPDATE'),
        'source_nom': 'INSEE',
        'source_url': INSEE_PAGE,
        'source_api': INSEE_URL,
        'serie_id': INSEE_SERIE,
        'note_historique': serie.get('TITLE_FR'),
        'derives': {
            'variation_trimestre_pt': round(dernier['valeur'] - avant['valeur'], 1),
            'methode': 'Écart en points avec le trimestre précédent.',
        },
        'historique': historique,
    }


def valider(cle, nouveau, ancien):
    """Lève une erreur si la donnée est vide, hors plage ou plus ancienne que la précédente."""
    h = nouveau.get('historique') or []
    if not h:
        raise ValueError('historique vide')
    if any(not isinstance(x.get('valeur'), (int, float)) or not x.get('date') for x in h):
        raise ValueError('valeur ou date manquante dans l\'historique')
    bas, haut = PLAGES[cle]
    v = nouveau['derniere_valeur']
    if not isinstance(v, (int, float)) or not bas <= v <= haut:
        raise ValueError(f'valeur hors plage plausible : {v} (attendu entre {bas} et {haut})')
    if not nouveau.get('date_publication'):
        raise ValueError('date de publication absente')
    if ancien and nouveau['date_valeur'] < ancien['date_valeur']:
        raise ValueError(f"date plus ancienne que la précédente : {nouveau['date_valeur']} < {ancien['date_valeur']}")


def sans_consultation(d):
    return {k: v for k, v in d.items() if k != 'date_consultation'}


def main():
    ancien = json.loads(SORTIE.read_text(encoding='utf-8')) if SORTIE.exists() else {}
    anciens = ancien.get('indicateurs', {})
    sources = {'taux_bce': taux_bce, 'permis_construire': permis_construire, 'chomage_bit': chomage_bit}
    resultats, erreurs = {}, []

    for cle, fonction in sources.items():
        precedent = anciens.get(cle)
        try:
            nouveau = fonction()
            valider(cle, nouveau, precedent)
            if precedent and sans_consultation(precedent) == nouveau:
                resultats[cle] = precedent  # rien de neuf : on garde la date de consultation d'origine
            else:
                nouveau['date_consultation'] = AUJOURDHUI
                resultats[cle] = nouveau
        except Exception as e:
            erreurs.append(f'{cle} : {e}')
            if precedent:
                resultats[cle] = precedent  # on garde les dernières données valides
            # sans données précédentes, l'indicateur est absent et le site n'affichera rien de vide

    if resultats != anciens:
        sortie = {
            'genere_le': AUJOURDHUI,
            'derniere_publication': max(r['date_publication'] for r in resultats.values()),
            'indicateurs': resultats,
        }
        SORTIE.parent.mkdir(parents=True, exist_ok=True)
        SORTIE.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print(f'{SORTIE.relative_to(RACINE)} mis à jour')
    else:
        print('Aucune donnée nouvelle, fichier inchangé')

    if erreurs:
        for e in erreurs:
            print(f'::error::Source macro en erreur, {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
