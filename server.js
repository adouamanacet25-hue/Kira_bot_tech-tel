// ============================================================
// KIRA TECH BOT - Bot Telegram complet
// Auteur : Mr KIRA tech & Mr EGO tech
// ============================================================

const { Telegraf, Markup } = require('telegraf');

// ==================== CONFIGURATION ====================
const TELEGRAM_TOKEN = '8717824473:AAFt2phoLICy9tBdKnAdnvn0tOguz7YVZH4';

// Images
const BOT_IMAGE = 'https://i.ibb.co/Y43kSvmD/EF5-C463-D-6-AA4-4078-8-CB7-68-D8-F3-AE14-C6.jpg';
const MENU_IMAGE = 'https://i.ibb.co/DPx14R8m/707744-F1-8668-49-A1-8-ED9-6353-D20-B987-A.jpg';

// Liens
const TG_CHANNEL = 'https://t.me/+mQ3aQpCsEqI0YmY0';
const TG_GROUP = 'https://t.me/+Z-P_xjUgJjU0MjM0';
const WA_CHANNEL = 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X';
const WA_GROUP = 'https://chat.whatsapp.com/Jeiy7Bty56p8oMs5hJrDWJ?s=cl&p=i&mlu=0&ilr=4';
const AUTHOR_LINK = 'https://t.me/+242061167625';

// IDs des chaînes (à remplir si tu veux forcer l'adhésion)
// Format : '@nom_du_canal' ou '-1001234567890'
const REQUIRED_CHANNELS = [
    // '@ton_canal_telegram', // décommente et remplace quand tu auras l'ID
];
const REQUIRED_GROUPS = [
    // '-1001234567890',
];

// ==================== BOT ====================
const bot = new Telegraf(TELEGRAM_TOKEN);

// ==================== MIDDLEWARE : Vérification adhésion ====================
async function checkMembership(ctx, next) {
    // Si aucune chaîne/groupe requis, on passe
    if (REQUIRED_CHANNELS.length === 0 && REQUIRED_GROUPS.length === 0) {
        return next();
    }

    try {
        const userId = ctx.from.id;
        const all = [...REQUIRED_CHANNELS, ...REQUIRED_GROUPS];

        for (const chat of all) {
            try {
                const member = await ctx.telegram.getChatMember(chat, userId);
                if (['left', 'kicked'].includes(member.status)) {
                    return ctx.reply(
                        `⛔ *Adhésion requise !*\n\nPour utiliser ce bot, rejoins d'abord :\n\n🔗 ${TG_CHANNEL}\n🔗 ${TG_GROUP}\n\nPuis renvoie /start`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (e) {
                // Le bot n'est pas admin du canal — on ignore
                console.log(`Impossible de vérifier ${chat}:`, e.message);
            }
        }
        return next();
    } catch (err) {
        return next();
    }
}

// ==================== FONCTIONS UTILITAIRES ====================
function nowFR() {
    return new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' });
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function sendImageWithText(ctx, imageUrl, caption, extra = {}) {
    try {
        await ctx.replyWithPhoto(imageUrl, { caption, parse_mode: 'Markdown', ...extra });
    } catch (e) {
        await ctx.reply(caption, { parse_mode: 'Markdown', ...extra });
    }
}

// Réaction emoji
async function react(ctx, emoji) {
    try {
        await ctx.telegram.setMessageReaction(
            ctx.chat.id,
            ctx.message.message_id,
            [{ type: 'emoji', em ▉oji }]
        );
    } catch (e) {
        // Ignore si la réaction é choue
    }
}

// ==================== /start ====================
bot.start(async (ctx) => {
    await react(ctx, '🔥');

    const亗 msg = `
╔═══════════════════════════════════════════╗
   ✦  WELCOME IN BOT TELEGRAM ✦
╚═══════════════════════════════════════════╝

✅ *NAME*      |KIRA亗 T|ECH 亗 |BOT🌹▉
👑 *CREATOR*   : MR KiRA & EGO 🌹

───────────────────────────────────────────
  *DESCRIPTION*
───────────────────────────────────────────
It's a Telegram bot with many commands
for fun, group management, and tools.

───────────────────────────────────────────
  *JOIN MY CHANNEL*
───────────────────────────────────────────
🔗 Telegram : ${TG_CHANNEL}
🔗 Groupe TG : ${TG_GROUP}
🔗 WhatsApp : ${WA_CHANNEL}

───────────────────────────────────────────
  *EXAMPLE COMMAND*
───────────────────────────────────────────
⚡ Type : /menu  (to see all commands) ✅

═══════════════════════════════════════════
> Power by KIRA & EGO tech 🌹
`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('📢 Chaîne Telegram', TG_CHANNEL)],
        [Markup.button.url('💬 Groupe Telegram', TG_GROUP)],
        [Markup.button.url('📱 Chaîne WhatsApp', WA_CHANNEL)],
        [Markup.button.url('👥 Groupe WhatsApp', WA_GROUP)],
        [Markup.button.url('👑 Contact Auteur', AUTHOR_LINK)],
    ]);

    await sendImageWithText(ctx, BOT_IMAGE, msg, keyboard);
});

// ==================== /menu ====================
bot.command('menu', async (ctx) => {
    await react(ctx, '📋');

    const menu = `
▉ 亗 |KIRA亗 T|ECH 亗 |BOT🌹▉
▰▰▰▰▰▰▰▰▰▰
➠ *Auteur* :  Mr kira tech 🌹
➠ *Prefix* : *[ . ]*
➠ *Total Cmds* : *100*

______________________

> ╢ *GROUP* ♰
╭▰▰▰▰▰▰▰◈
┆❏ .antilink
┆❏ .goodbye
┆❏ .ppgroup
┆❏ .groupinfo
┆❏ .groupname
┆❏ .kick
┆❏ .purge
┆❏ .link
┆❏ .listadmin
┆❏ .mut
