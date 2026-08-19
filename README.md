# Sentiment Analysis avec MLOps (100% gratuit)

Pipeline complet de classification de sentiments sur des critiques de films IMDB, utilisant DistilBERT, GitHub Actions et Hugging Face Inference API.

## Fonctionnalités

- Entraînement automatique d'un modèle DistilBERT sur le dataset IMDB.
- Évaluation avec seuil de performance (accuracy >= 0.85).
- Publication du modèle sur Hugging Face Hub.
- Déploiement d'une interface web statique sur GitHub Pages.
- Appel à l'API d'inférence serverless de Hugging Face (gratuite).
- Tests et lint automatiques.

## Configuration

1. Créez un compte Hugging Face et un token avec permission `write`.
2. Créez un dépôt GitHub public et ajoutez les secrets :
   - `HF_USERNAME` : votre nom d'utilisateur Hugging Face.
   - `HF_TOKEN` : votre token Hugging Face.
3. Dans `frontend/script.js`, remplacez `VOTRE_NOM_UTILISATEUR` par votre vrai nom d'utilisateur HF.
4. Poussez le code sur la branche `main`. Le pipeline s'exécute automatiquement.
5. Activez GitHub Pages :
   - Allez dans **Settings** → **Pages**.
   - Source : **Deploy from a branch**.
   - Branche : `gh-pages`, dossier `/ (root)`.
   - Sauvegardez. Votre site sera disponible à `https://<votre-user>.github.io/<repo>/`.

## Utilisation

Ouvrez l'URL de votre site GitHub Pages, entrez un texte en anglais et cliquez sur "Analyser".  
Le frontend appelle l'API d'inférence Hugging Face et affiche le sentiment prédit.

## Limitations

- L'API d'inférence serverless est gratuite mais limitée en nombre de requêtes (environ 1000/jour/modèle).  
  Pour un usage plus intensif, ajoutez un token HF dans les headers de la requête (voir `script.js`).
- Le premier appel peut être lent (cold start).

## Licence

MIT