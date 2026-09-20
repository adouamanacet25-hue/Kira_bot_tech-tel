# KIRA TECH BOT — Telegram → WhatsApp (pairing code)

## Installation locale
```bash
npm install
node server.js
```

## Variable d'environnement à définir
Ne laisse pas ton token Telegram en clair dans `server.js` en production.
Sur Render (ou en local), définis :
```
TELEGRAM_BOT_TOKEN=8717824473:AAFt2phoLICy9tBdKnAdnvn0tOguz7YVZH4
```
Si cette variable n'est pas définie, le code utilise la valeur de secours codée
dans `CONFIG.telegramToken` — pratique pour tester vite, mais à remplacer
avant de partager le dépôt publiquement (ex: GitHub).

## Utilisation
1. Ouvre ton bot sur Telegram → `/start`
2. `/pair 242xxxxxxxxx` (indicatif pays + numéro, sans `+`)
3. Le bot renvoie un pairing code valable **5 minutes**
4. Sur WhatsApp : Paramètres → Appareils connectés → Connecter un appareil →
   Connecter avec le numéro de téléphone → entre le code
5. Une fois connecté, tape `.menu` directement sur WhatsApp

## Déploiement sur Render
- Build command : `npm install`
- Start command : `node server.js`
- Ajoute la variable d'environnement `TELEGRAM_BOT_TOKEN`
- Le service doit rester "Web Service" (Render exige un port HTTP ouvert,
  déjà géré ici par le petit serveur Express)

## ⚠️ Limite importante : pas de disque persistant
Sans disque persistant (plan Render gratuit standard), le dossier
`sessions/<id>/` qui contient les identifiants WhatsApp est supprimé à
chaque redémarrage ou mise en veille du service. Résultat : il faut refaire
`/pair` après chaque redémarrage. C'est normal, ce projet est prévu pour
tester les commandes tant que le process tourne en continu.

Pour une session qui survit aux redémarrages, deux options :
- ajouter un disque persistant Render (payant) monté sur `sessions/`
- ou stocker les credentials Baileys dans une base externe (Mongo,
  Postgres, S3...) au lieu de fichiers locaux — nécessite d'adapter
  `useMultiFileAuthState` par un state store personnalisé

## Commandes actuellement branchées
Voir `.menu` sur WhatsApp ou `/menu` sur Telegram pour la liste à jour.
Les commandes citées dans le cahier des charges mais pas encore codées
(`.voice`, `.song`, `.google`, `.video`, `.fakechat`, `.antidelete`,
`.gpstatus`, `.checkban`, `.banbot`) répondent actuellement par un message
"🚧 pas encore branchée" — dis-moi lesquelles coder en priorité et je les
ajoute une par une (ce sont surtout des branchements d'API externes ou de
stockage qu'il vaut mieux faire par petites étapes pour bien tester).
