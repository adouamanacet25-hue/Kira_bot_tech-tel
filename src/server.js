/**
 * ▉ 亗 |KIRA亗 T|ECH 亗 |BOT🌹▉
 * Bot Telegram (connexion / pairing code) + Bot WhatsApp (Baileys)
 * Auteur du bot : Mr KIRA tech & Mr EGO TECH
 *
 * IMPORTANT (à lire avant de déployer) :
 * - Sans disque persistant (Render free / sans disk add-on), le dossier
 *   de session WhatsApp (./sessions/<id>) est perdu à chaque redémarrage
 *   ou mise en veille du service. C'est normal et attendu : ce code sert
 *   à générer un pairing code et tester les commandes tant que le process
 *   tourne. Pour une session qui survit aux redémarrages, il faut un
 *   disque persistant (ou un stockage externe type Mongo/Postgres/S3
 *   pour les credentials Baileys).
 * - Un seul pairing code actif par demande, valable 5 minutes. Passé ce
 *   délai sans connexion réussie, la session est fermée et il faut
 *   retaper /pair.
 */

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  botName: '▉ 亗 |KIRA亗 T|ECH 亗 |BOT🌹▉',
  author: 'Mr KIRA tech & Mr EGO TECH',
  prefix: '.',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || 'PUT_YOUR_TELEGRAM_TOKEN_HERE',
  telegramChannel: 'https://t.me/+mQ3aQpCsEqI0YmY0',
  telegramGroup: 'https://t.me/+Z-P_xjUgJjU0MjM0',
  whatsappChannel: 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X',
  whatsappGroup: 'https://chat.whatsapp.com/Jeiy7Bty56p8oMs5hJrDWJ?s=cl&p=i&mlu=0&ilr=4',
  authorTelegramContact: 'https://t.me/+242061167625',
  banToolLink: 'https://adouamanacet25-hue.github.io/Dark-purge/',
  botImageUrl: 'https://i.ibb.co/Y43kSvmD/EF5-C463-D-6-AA4-4078-8-CB7-68-D8-F3-AE14-C6.jpg',
  repoLink: 'https://github.com/',
  pairingCodeValidityMs: 5 * 60 * 1000, // 5 minutes
  port: process.env.PORT || 3000,
};

if (CONFIG.telegramToken === 'PUT_YOUR_TELEGRAM_TOKEN_HERE') {
  console.warn('⚠️  Aucun TELEGRAM_BOT_TOKEN défini en variable d\'environnement. ' +
    'Pour la sécurité, définis-le dans les variables d\'environnement Render ' +
    'plutôt que de le laisser en dur dans le code.');
}

// ============================================================
// SERVEUR EXPRESS (keep-alive pour Render)
// ============================================================
const app = express();
app.get('/', (req, res) => res.send(`${CONFIG.botName} est en ligne ✅`));
app.listen(CONFIG.port, () => console.log(`🌐 Serveur HTTP prêt sur le port ${CONFIG.port}`));

// ============================================================
// BOT TELEGRAM
// ============================================================
const tgBot = new TelegramBot(CONFIG.telegramToken, { polling: true });

// sessions[chatId] = { sock, number, folder, pairTimer, connected, groupSettings }
const sessions = {};

function sessionsFolder(chatId) {
  return path.join(__dirname, 'sessions', String(chatId));
}

function clearSession(chatId) {
  const s = sessions[chatId];
  if (!s) return;
  if (s.pairTimer) clearTimeout(s.pairTimer);
  try {
    if (s.sock) s.sock.end(undefined);
  } catch (e) {}
  delete sessions[chatId];
}

// ---------- /start ----------
tgBot.onText(/^\/start/, (msg) => {
  const chatId = msg.chat.id;
  const caption =
    `═══════════════════════════════\n` +
    `   ✦  WELCOME IN BOT TELEGRAM ✦\n` +
    `═══════════════════════════════\n\n` +
    `✅ NAME    : ${CONFIG.botName}\n` +
    `👑 CREATOR : Mr KIRA & EGO 🌹\n\n` +
    `───────────────────────────────\n` +
    `  DESCRIPTION\n` +
    `───────────────────────────────\n` +
    `Bot Telegram qui connecte un compte WhatsApp\n` +
    `(pairing code) pour utiliser de nombreuses commandes.\n\n` +
    `───────────────────────────────\n` +
    `  EXEMPLE DE COMMANDE\n` +
    `───────────────────────────────\n` +
    `⚡ Tape : /pair 242xxxxxxxxx  (avec ton indicatif pays, sans +) ✅\n` +
    `═══════════════════════════════`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '📢 Rejoindre la chaîne Telegram', url: CONFIG.telegramChannel }],
      [{ text: '👥 Rejoindre le groupe Telegram', url: CONFIG.telegramGroup }],
      [{ text: '💬 Rejoindre la chaîne WhatsApp', url: CONFIG.whatsappChannel }],
      [{ text: '👥 Rejoindre le groupe WhatsApp', url: CONFIG.whatsappGroup }],
    ],
  };

  tgBot.sendPhoto(chatId, CONFIG.botImageUrl, { caption, reply_markup: keyboard })
    .catch(() => tgBot.sendMessage(chatId, caption, { reply_markup: keyboard }));
});

// ---------- /help ----------
tgBot.onText(/^\/help/, (msg) => {
  const text =
    `📖 *Aide — ${CONFIG.botName}*\n\n` +
    `/start — présentation du bot\n` +
    `/pair <numéro> — connecte ton WhatsApp (ex: /pair 242061234567)\n` +
    `/menu — affiche le menu des commandes WhatsApp\n` +
    `/help — cette aide\n\n` +
    `Une fois connecté sur WhatsApp, tape *${CONFIG.prefix}menu* pour voir\n` +
    `toutes les commandes disponibles sur WhatsApp.`;
  tgBot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// ---------- /menu ----------
tgBot.onText(/^\/menu/, (msg) => {
  tgBot.sendMessage(msg.chat.id, buildWaMenuText(), { parse_mode: 'Markdown' });
});

// ---------- /pair ----------
tgBot.onText(/^\/pair(?:\s+(\S+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const number = (match[1] || '').replace(/[^0-9]/g, '');

  if (!number) {
    return tgBot.sendMessage(chatId, 'Utilisation : /pair 242061234567 (indicatif pays + numéro, sans +, sans espace)');
  }

  if (sessions[chatId] && sessions[chatId].connected) {
    return tgBot.sendMessage(chatId, 'Ton WhatsApp est déjà connecté ✅. Tape /menu pour voir les commandes.');
  }

  await tgBot.sendMessage(chatId, 'Demande de pairing code….. 🔄\nVeuillez patienter 🙏\n\n|  Mr kira tech🌹');

  try {
    await startPairing(chatId, number);
  } catch (err) {
    console.error('Erreur pairing:', err);
    tgBot.sendMessage(chatId, '❌ Échec ❌\nDésolé, le bot n\'a pas pu générer de pairing code. Tape /pair pour réessayer 🥀');
  }
});

async function startPairing(chatId, number) {
  // Session précédente : on la ferme proprement avant d'en recréer une.
  clearSession(chatId);

  const folder = sessionsFolder(chatId);
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(folder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['KIRA TECH BOT', 'Chrome', '1.0.0'],
  });

  sessions[chatId] = {
    sock,
    number,
    folder,
    connected: false,
    settings: { antilink: false, welcome: true, goodbye: true },
  };

  sock.ev.on('creds.update', saveCreds);

  // Un seul code de pairing par demande, request juste après l'ouverture du socket
  if (!sock.authState.creds.registered) {
    // petit délai pour laisser le socket s'initialiser avant de demander le code
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(number);
        const formatted = code.match(/.{1,4}/g).join('-');

        const captionMsg =
          `Name : ${CONFIG.botName}\n\n` +
          `Demande de pairing au ${number}\n\n` +
          `__________________________________\n\n` +
          `        ${formatted}   🔑\n\n` +
          `__________________________________\n\n` +
          `Merci aux killers 🌹 pour ton bot 🤖\n\n` +
          `📱 *Comment connecter :*\n` +
          `Android : WhatsApp > Paramètres > Appareils connectés > Connecter un appareil > Connecter avec le numéro de téléphone\n` +
          `iPhone : WhatsApp > Réglages > Appareils connectés > Connecter un appareil > Connecter avec le numéro de téléphone\n\n` +
          `⏳ Ce code expire dans 5 minutes.`;

        tgBot.sendPhoto(chatId, CONFIG.botImageUrl, { caption: captionMsg })
          .catch(() => tgBot.sendMessage(chatId, captionMsg));
      } catch (err) {
        console.error('Erreur requestPairingCode:', err);
        tgBot.sendMessage(chatId, '❌ Échec ❌\nDésolé, le bot n\'a pas pu générer de pairing code. Tape /pair pour réessayer 🥀');
        clearSession(chatId);
      }
    }, 1500);

    // Le code doit être utilisé sous 5 minutes, sinon on ferme la session.
    sessions[chatId].pairTimer = setTimeout(() => {
      const s = sessions[chatId];
      if (s && !s.connected) {
        tgBot.sendMessage(chatId, '❌ Échec ❌\nLe pairing code a expiré (5 min). Tape /pair pour reconnecter le bot 🥀');
        clearSession(chatId);
      }
    }, CONFIG.pairingCodeValidityMs);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      const s = sessions[chatId];
      if (s) {
        s.connected = true;
        if (s.pairTimer) clearTimeout(s.pairTimer);
      }
      const now = new Date();
      const dateStr = now.toLocaleString('fr-FR');
      const successMsg =
        `🎉🎉🎉🎉 Succès 🎉🎉🎉🎉\n` +
        `✅ Bot is connect ✅\n` +
        `📶 Statut : open ✅\n` +
        `🕒 Date de connexion : ${dateStr}\n\n` +
        `Tape *.menu* directement sur WhatsApp pour voir les commandes.\n\n` +
        `Merci au killer duo 🌹`;
      tgBot.sendPhoto(chatId, CONFIG.botImageUrl, { caption: successMsg, parse_mode: 'Markdown' })
        .catch(() => tgBot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' }));
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const s = sessions[chatId];
      if (s && s.connected && shouldReconnect) {
        // reconnexion silencieuse en cas de coupure réseau
        tgBot.sendMessage(chatId, '🔄 Connexion WhatsApp perdue, tentative de reconnexion...');
        startPairing(chatId, s.number).catch(() => {});
      } else {
        if (s) {
          tgBot.sendMessage(chatId, '❌ Session WhatsApp fermée. Tape /pair pour reconnecter le bot 🥀');
        }
        clearSession(chatId);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    try {
      await handleWhatsAppMessage(sock, m, sessions[chatId]);
    } catch (err) {
      console.error('Erreur traitement message WA:', err);
    }
  });

  sock.ev.on('group-participants.update', async (event) => {
    try {
      await handleGroupParticipantsUpdate(sock, event, sessions[chatId]);
    } catch (err) {
      console.error('Erreur group-participants.update:', err);
    }
  });

  return sock;
}

// ============================================================
// MENU WHATSAPP
// ============================================================
function buildWaMenuText() {
  return (
`${CONFIG.botName}
▰▰▰▰▰▰▰▰▰▰
➠ Auteur : Mr kira tech 🌹
➠ Préfixe : *[ ${CONFIG.prefix} ]*
______________________

> ╢ GROUPE ♰
╭▰▰▰▰▰▰▰◈
┆❏ ${CONFIG.prefix}antilink
┆❏ ${CONFIG.prefix}welcome on/off
┆❏ ${CONFIG.prefix}goodbye on/off
┆❏ ${CONFIG.prefix}ppgroup
┆❏ ${CONFIG.prefix}groupinfo
┆❏ ${CONFIG.prefix}groupname <nom>
┆❏ ${CONFIG.prefix}kick @membre
┆❏ ${CONFIG.prefix}promote @membre
┆❏ ${CONFIG.prefix}mute
┆❏ ${CONFIG.prefix}unmute
┆❏ ${CONFIG.prefix}listadmin
┆❏ ${CONFIG.prefix}tag <texte>
┆❏ ${CONFIG.prefix}tagall
┆❏ ${CONFIG.prefix}link
╰▰▰▰▰▰▰▰◈

> ╢ FUN ♰
╭▰▰▰▰▰▰▰◈
┆❏ ${CONFIG.prefix}blague
┆❏ ${CONFIG.prefix}compliment
┆❏ ${CONFIG.prefix}dare
┆❏ ${CONFIG.prefix}fact
┆❏ ${CONFIG.prefix}flirt
┆❏ ${CONFIG.prefix}goodnight
┆❏ ${CONFIG.prefix}quote
┆❏ ${CONFIG.prefix}roseday
┆❏ ${CONFIG.prefix}ship @a @b
┆❏ ${CONFIG.prefix}truth
┆❏ ${CONFIG.prefix}valentine
╰▰▰▰▰▰▰▰◈

> ╢ GENERAL ♰
╭▰▰▰▰▰▰▰◈
┆❏ ${CONFIG.prefix}alive
┆❏ ${CONFIG.prefix}channelid
┆❏ ${CONFIG.prefix}fancy <texte>
┆❏ ${CONFIG.prefix}menu
┆❏ ${CONFIG.prefix}owner
┆❏ ${CONFIG.prefix}ping
┆❏ ${CONFIG.prefix}repo
╰▰▰▰▰▰▰▰◈

> ╢ TOOLS ♰
╭▰▰▰▰▰▰▰◈
┆❏ ${CONFIG.prefix}support ban
╰▰▰▰▰▰▰▰◈

> power by kira & EGo tech 🌹`
  );
}

// ============================================================
// DONNÉES POUR LES COMMANDES FUN (secours hors-ligne si l'API échoue)
// ============================================================
const BLAGUES = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau !",
  "Qu'est-ce qu'un crocodile qui surveille la pharmacie ? Un pharma-cocodile.",
  "Pourquoi les poissons détestent l'ordinateur ? Ils ont peur du net.",
  "Que dit un mur à un autre mur ? On se rejoint au coin.",
  "Quel est le sport le plus silencieux ? Le para-chute.",
];
const COMPLIMENTS = [
  "Tu illumines chaque groupe où tu passes ✨",
  "Ton énergie est contagieuse 🔥",
  "Tu as un sourire qui change la journée de quelqu'un 😄",
];
const FACTS = [
  "Le miel ne se périme jamais s'il est bien conservé.",
  "Les octopus ont trois cœurs.",
  "Le mont Everest grandit d'environ 4 mm chaque année.",
];
const QUOTES = [
  "« La discipline est le pont entre les objectifs et les résultats. »",
  "« Ce n'est pas parce que les choses sont difficiles qu'on n'ose pas, c'est parce qu'on n'ose pas qu'elles sont difficiles. »",
];

function fancyText(text) {
  const map = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
    j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ',
    s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
  };
  return text
    .toLowerCase()
    .split('')
    .map((c) => map[c] || c)
    .join('');
}

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// GESTION DES MESSAGES WHATSAPP
// ============================================================
async function handleWhatsAppMessage(sock, m, session) {
  const jid = m.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');
  const body =
    m.message.conversation ||
    m.message.extendedTextMessage?.text ||
    m.message.imageMessage?.caption ||
    '';

  if (!body.startsWith(CONFIG.prefix)) return;

  const withoutPrefix = body.slice(CONFIG.prefix.length).trim();
  const [cmdRaw, ...args] = withoutPrefix.split(/\s+/);
  const cmd = (cmdRaw || '').toLowerCase();
  const sender = m.key.participant || m.key.remoteJid;

  let groupMeta = null;
  let isSenderAdmin = false;
  let isBotAdmin = false;
  if (isGroup) {
    groupMeta = await sock.groupMetadata(jid).catch(() => null);
    if (groupMeta) {
      const senderP = groupMeta.participants.find((p) => p.id === sender);
      isSenderAdmin = !!senderP && (senderP.admin === 'admin' || senderP.admin === 'superadmin');
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const botP = groupMeta.participants.find((p) => p.id.startsWith(sock.user.id.split(':')[0]));
      isBotAdmin = !!botP && (botP.admin === 'admin' || botP.admin === 'superadmin');
    }
  }

  const reply = (text) => sock.sendMessage(jid, { text }, { quoted: m });
  const mentionedJids = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

  switch (cmd) {
    // ---------- GENERAL ----------
    case 'menu':
      return reply(buildWaMenuText());

    case 'ping': {
      const start = Date.now();
      await reply('🏓 Pong...');
      return reply(`🏓 Pong ! ${Date.now() - start}ms`);
    }

    case 'alive':
      return reply(`✅ ${CONFIG.botName} est en ligne et fonctionnel !`);

    case 'owner':
      return reply(`👑 Auteur : ${CONFIG.author}\nContact : ${CONFIG.authorTelegramContact}`);

    case 'repo':
      return reply(`📦 Dépôt du bot : ${CONFIG.repoLink}`);

    case 'channelid':
      return reply(`🆔 ID de ce chat : ${jid}`);

    case 'fancy':
      if (!args.length) return reply(`Utilisation : ${CONFIG.prefix}fancy <texte>`);
      return reply(fancyText(args.join(' ')));

    case 'date':
      return reply(`📅 ${new Date().toLocaleString('fr-FR')}`);

    case 'author':
      return reply(`👑 ${CONFIG.author}`);

    case 'section':
      return reply(buildWaMenuText());

    case 'link':
      return reply(
        `JOIN MY CHANNEL\n\n` +
        `💬 WhatsApp : ${CONFIG.whatsappChannel}\n` +
        `👥 Groupe WhatsApp : ${CONFIG.whatsappGroup}\n` +
        `📢 Telegram : ${CONFIG.telegramChannel}\n` +
        `👥 Groupe Telegram : ${CONFIG.telegramGroup}`
      );

    // ---------- GROUPE (admin) ----------
    case 'groupinfo': {
      if (!isGroup || !groupMeta) return reply('❌ Cette commande fonctionne seulement dans un groupe.');
      return reply(
        `📛 Nom : ${groupMeta.subject}\n` +
        `📝 Description : ${groupMeta.desc || 'aucune'}\n` +
        `👥 Membres : ${groupMeta.participants.length}`
      );
    }

    case 'ppgroup': {
      if (!isGroup) return reply('❌ Cette commande fonctionne seulement dans un groupe.');
      try {
        const url = await sock.profilePictureUrl(jid, 'image');
        return sock.sendMessage(jid, { image: { url }, caption: '📷 Photo du groupe' }, { quoted: m });
      } catch {
        return reply('❌ Ce groupe n\'a pas de photo de profil.');
      }
    }

    case 'groupname': {
      if (!isGroup) return reply('❌ Cette commande fonctionne seulement dans un groupe.');
      if (!isSenderAdmin) return reply('❌ Réservé aux admins du groupe.');
      const newName = args.join(' ');
      if (!newName) return reply(`Utilisation : ${CONFIG.prefix}groupname <nouveau nom>`);
      await sock.groupUpdateSubject(jid, newName);
      return reply(`✅ Nom du groupe changé en : ${newName}`);
    }

    case 'listadmin': {
      if (!isGroup || !groupMeta) return reply('❌ Cette commande fonctionne seulement dans un groupe.');
      const admins = groupMeta.participants.filter((p) => p.admin);
      const list = admins.map((a, i) => `${i + 1}. @${a.id.split('@')[0]}`).join('\n');
      return sock.sendMessage(jid, { text: `👑 Admins :\n${list}`, mentions: admins.map((a) => a.id) }, { quoted: m });
    }

    case 'kick': {
      if (!isGroup) return reply('❌ Cette commande fonctionne seulement dans un groupe.');
      if (!isSenderAdmin) return reply('❌ Réservé aux admins du groupe.');
      if (!isBotAdmin) return reply('❌ Le bot doit être admin pour faire ça.');
      const target = mentionedJids[0] || (args[0] ? `${args[0].replace(/[^0-9]/g, '')}@s.whatsapp.net` : null);
      if (!target) return reply(`Utilisation : ${CONFIG.prefix}kick @membre ou ${CONFIG.prefix}kick 24206xxxxxx`);
      await sock.groupParticipantsUpdate(jid, [target], 'remove');
      return reply('✅ Membre expulsé.');
    }

    case 'promote': {
      if (!isGroup) return reply('❌ Cette commande fonctionne seulement dans un groupe.');
      if (!isSenderAdmin) return reply('❌ Réservé aux admins du groupe.');
      if (!isBotAdmin) return reply('❌ Le bot doit être admin pour faire ça.');
      const target = mentionedJids[0];
      if (!target) return reply(`Utilisation : ${CONFIG.prefix}promote @membre`);
      await sock.groupParticipantsUpdate(jid, [target], 'promote');
      return reply('✅ Membre promu admin.');
    }

    case 'demote': {
      if (!isGroup) return reply('❌ Cette commande fonctionne seulement dans un groupe.');
      if (!isSenderAdmin) return reply('❌ Réservé aux admins du groupe.');
      if (!isBotAdmin) return reply('❌ Le bot doit être admin pour faire ça.');
      const target = mentionedJids[0];
      if (!target) return reply(`Utilisation : ${CONFIG.prefix}demote @membre`);
      await sock.groupParticipantsUpdate(jid, [target], 'demote');
      return r
