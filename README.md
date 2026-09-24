# SecureSMS

Application Android universitaire de messagerie sécurisée avec création de compte, verrouillage par PIN et protection des messages.

## Protections implémentées

- Inscription, connexion ou accès avec Google avant la configuration du PIN.
- App Lock par PIN à 6 chiffres.
- Anti-brute-force : délai entre les essais et verrouillage temporaire après 5 échecs.
- Session protégée : expiration, inactivité, gestion de l’arrière-plan et réauthentification des actions sensibles.
- Validation du numéro et du message, avec longueurs maximales et erreurs UI.
- SQLite avec requêtes préparées et paramètres liés pour les données saisies.
- Chiffrement AES-256-GCM des nouveaux messages avant stockage.
- HMAC-SHA-256 séparé, vérifié avant tout déchiffrement.
- Clés AES et HMAC stockées par SecureStore, protégé par Android Keystore.
- Journalisation sensible neutralisée : champs secrets masqués en développement et aucun log en production.
- Permissions Android réduites au strict nécessaire.
- Backups Android désactivés.
- Détection root expérimentale avec état « indisponible » si le contrôle ne peut pas être exécuté.
- Release durcie : R8, suppression des ressources inutilisées et trafic HTTP clair interdit.

Les contacts et messages initiaux sont des fixtures non sensibles dans le code. Seuls les nouveaux messages créés dans l’application sont chiffrés et persistés dans SQLite.

## Lancer et vérifier

```bash
npm install
npx expo start
```

Scénario rapide :

1. S’inscrire, se connecter ou choisir Google, puis créer et confirmer le PIN.
2. Composer un message et modifier le numéro ou dépasser 320 caractères pour voir les erreurs.
3. Envoyer un message, redémarrer l’application et vérifier qu’il est restauré avec l’indicateur `HMAC ✓`.
4. Ouvrir Réglages, puis « Simuler une altération » pour vérifier que le contenu modifié est refusé.
5. Mettre l’application en arrière-plan plus de 30 secondes pour vérifier l’auto-lock.

## Vérifications techniques

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Build Android signé

Le durcissement natif de `app.json` est appliqué pendant le prebuild/EAS Build. Aucun keystore de signature ne doit être ajouté au dépôt.

```bash
npx eas-cli@latest build --platform android --profile preview
```

Le profil `preview` produit un APK interne signé. Le profil `production` produit un Android App Bundle signé :

```bash
npx eas-cli@latest build --platform android --profile production
```

La détection root reste un signal de risque et ne constitue jamais une preuve absolue : elle peut produire des faux positifs ou être contournée.
