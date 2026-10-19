#!/usr/bin/env python3
"""Vérifie le format de public/data/macro.json et le fonctionnement des garde-fous.

Usage : python3 scripts/test_macro.py   (code de sortie 1 en cas d'échec)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from maj_macro import PLAGES, SORTIE, valider  # noqa: E402

FORMATS_DATE = {
    'taux_bce': r'^\d{4}-\d{2}-\d{2}$',
    'permis_construire': r'^\d{4}-\d{2}$',
    'chomage_bit': r'^\d{4}-Q[1-4]$',
}
CHAMPS = ['libelle', 'unite', 'frequence', 'derniere_valeur', 'date_valeur', 'date_publication',
          'date_consultation', 'source_nom', 'source_url', 'serie_id', 'derives', 'historique']
ISO = r'^\d{4}-\d{2}-\d{2}$'
erreurs = []


def verifier(condition, message):
    if not condition:
        erreurs.append(message)


# 1. Format du fichier
d = json.loads(SORTIE.read_text(encoding='utf-8'))
verifier(re.match(ISO, d.get('genere_le', '')), 'genere_le absent ou mal formé')
verifier(re.match(ISO, d.get('derniere_publication', '')), 'derniere_publication absente ou mal formée')
ind = d.get('indicateurs', {})
verifier(set(ind) == set(FORMATS_DATE), f'indicateurs attendus : {sorted(FORMATS_DATE)}, trouvés : {sorted(ind)}')

for cle, i in ind.items():
    for c in CHAMPS:
        verifier(c in i and i[c] not in (None, ''), f'{cle} : champ {c} manquant ou vide')
    h = i.get('historique') or []
    verifier(len(h) > 1, f'{cle} : historique trop court')
    verifier(all(re.match(FORMATS_DATE[cle], x['date']) for x in h), f'{cle} : date mal formée dans l\'historique')
    verifier(all(isinstance(x['valeur'], (int, float)) for x in h), f'{cle} : valeur non numérique dans l\'historique')
    verifier([x['date'] for x in h] == sorted(x['date'] for x in h), f'{cle} : historique non trié')
    verifier(h and h[-1]['date'] == i.get('date_valeur') and h[-1]['valeur'] == i.get('derniere_valeur'),
             f'{cle} : la dernière valeur ne correspond pas à la fin de l\'historique')
    bas, haut = PLAGES[cle]
    v = i.get('derniere_valeur')
    verifier(isinstance(v, (int, float)) and bas <= v <= haut, f'{cle} : dernière valeur absente ou hors plage')
    verifier(re.match(ISO, i.get('date_publication') or ''), f'{cle} : date_publication mal formée')
    verifier(re.match(ISO, i.get('date_consultation') or ''), f'{cle} : date_consultation mal formée')
    verifier(str(i.get('source_url', '')).startswith('https://'), f'{cle} : source_url invalide')

# 2. Garde-fous (hors ligne, sur des données simulées)
base = ind['chomage_bit']
cas_rejetes = {
    'historique vide': {**base, 'historique': []},
    'valeur hors plage': {**base, 'derniere_valeur': 95.0},
    'date plus ancienne': {**base, 'date_valeur': '1990-Q1'},
    'publication absente': {**base, 'date_publication': None},
}
for nom, donnee in cas_rejetes.items():
    try:
        valider('chomage_bit', donnee, base)
        erreurs.append(f'garde-fou inactif : {nom}')
    except ValueError:
        pass
try:
    valider('chomage_bit', base, base)
except ValueError as e:
    erreurs.append(f'donnée valide rejetée à tort : {e}')

if erreurs:
    print('ÉCHEC du test de public/data/macro.json :')
    for e in erreurs:
        print(' -', e)
    sys.exit(1)
print(f'OK : {len(ind)} indicateurs, format valide, garde-fous actifs')
