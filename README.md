# 🌊 Abysse : laboratoire d'évolution

Des créatures aquatiques vertébrées qui **apprennent à nager, chasser et fuir par sélection naturelle**, directement dans le navigateur. Rien à installer.

## Lancer

Ouvre `index.html` dans Chrome, Edge ou Firefox (double-clic). C'est tout.

La progression est sauvegardée automatiquement dans le navigateur (IndexedDB).

## Ce qu'il y a dedans

- **Neuroévolution** : chaque créature a un cerveau (réseau de neurones, 1 à 3 couches, mémoire récurrente, neurogenèse) et un corps (vertèbres, nageoires, muscles) codés dans un génome. À chaque génération, des centaines de copies sont testées, les meilleures se reproduisent avec mutations et croisements.
- **Physique de nage réelle** : résistance de l'eau sur chaque vertèbre (théorie des forces résistives). Personne ne leur apprend à onduler, elles le découvrent.
- **Océan géant** (9000 × 5200) zoomable, avec écosystème : reproduction libre, faim, prédation, extinctions.
- **Labo multi-espèces** : contraintes personnalisables (squelette, muscles, cerveau, sens, évolution, objectif, régime alimentaire), 13 modèles de départ.
- **Prédateurs et proies** : sens de la peur, digestion, taille des proies.
- **Spécimens** : individus figés, stériles et immortels, pour l'observation.
- **Arène** : duels de 1 contre 1 jusqu'à 15 contre 15 (combat, course aux crevettes, sprint).
- **Outils d'observation** : ralenti et accéléré (¼× à 16×), cerveau en direct, courbure des muscles, forces de l'eau, rayons X, courbes d'évolution, musée des fossiles, course contre l'ancêtre.

## Développement

Le code est découpé dans `src/` :

| Fichier | Rôle |
|---|---|
| `core.js` | Physique, cerveau, génome, essais et moteur d'évolution (tourne aussi dans un Web Worker) |
| `main1.js` | État, worker, mondes (océan et arène), écologie, caméra, rendu |
| `main2.js` | Barre du haut, panneau du labo, onglets Espèce et Individu, bassin d'essai |
| `main4.js` | Spécimens et arène |
| `main3.js` | Éditeur d'espèce, presets, sauvegarde, boucle principale |
| `page.html` | Gabarit HTML et CSS |

Après une modification dans `src/`, régénère `index.html` :

```bash
python3 build.py
```
