// ============================================================
// KIRA TECH BOT - Bot Telegram complet
// Auteur : Mr KIRA tech & Mr EGO tech
// ============================================================

const { Telegraf, Markup } = require('telegraf');

// ==================== CONFIGURATION ====================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8717824473:AAFt2phoLICy9tBdKnAdnvn0tOguz7YVZH4';

const BOT_IMAGE = 'https://i.ibb.co/Y43kSvmD/EF5-C463-D-6-AA4-4078-8-CB7-68-D8-F3-AE14-C6.jpg';
const MENU_IMAGE = 'https://i.ibb.co/DPx14R8m/707744-F1-8668-49-A1-8-ED9-6353-D20-B987-A.jpg';

const TG_CHANNEL = 'https://t.me/+mQ3aQpCsEqI0YmY0';
const TG_GROUP = 'https://t.me/+Z-P_xjUgJjU0MjM0';
const WA_CHANNEL = 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X';
const WA_GROUP = 'https://chat.whatsapp.com/Jeiy7Bty56p8oMs5hJrDWJ?s=cl&p=i&mlu=0&ilr=4';
const AUTHOR_LINK = 'https://t.me/+242061167625';

const REQUIRED_CHANNELS = [];
const REQUIRED_GROUPS = [];

// ==================== BOT ====================
const bot = new Telegraf(TELEGRAM_TOKEN);

// ==================== MIDDLEWARE ====================
async function checkMembership(ctx, next) {
    if (REQUIRED_CHANNELS.length === 0 && REQUIRED_GROUPS.length === 0) return next();
    try {
        const userId = ctx.from.id;
        const all = [...REQUIRED_CHANNELS, ...REQUIRED_GROUPS];
        for (const chat of all) {
            try {
                const member = await ctx.telegram.getChatMember(chat, userId);
                if (['left', 'kicked'].includes(member.status)) {
                    return ctx.reply(`Adhesion requise ! Rejoins ${TG_CHANNEL} puis renvoie /start`, { parse_mode: 'Markdown' });
                }
            } catch (e) { console.log(`Verif ${chat}:`, e.message); }
        }
        return next();
    } catch (err) { return next(); }
}
// bot.use(checkMembership); // Decommenter pour activer

// ==================== FONCTIONS ====================
function nowFR() { return new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' }); }

async function sendImageWithText(ctx, imageUrl, caption, extra = {}) {
    try { await ctx.replyWithPhoto(imageUrl, { caption, parse_mode: 'Markdown', ...extra }); }
    catch (e) { await ctx.reply(caption, { parse_mode: 'Markdown', ...extra }); }
}

async function react(ctx, emoji) {
    try {
        await ctx.telegram.setMessageReaction(ctx.chat.id, ctx.message.message_id, [{ type: 'emoji', emoji }]);
    } catch (e) { /* ignore */ }
}

// ==================== COMMANDES ====================

bot.start(async (ctx) => {
    await react(ctx, '🔥');
    const msg = `
KIRA TECH BOT

NAME      : KIRA TECH BOT
CREATOR   : MR KiRA & EGO

DESCRIPTION
It is a Telegram bot with many commands.

JOIN MY CHANNEL
Telegram : ${TG_CHANNEL}
Groupe TG : ${TG_GROUP}
WhatsApp : ${WA_CHANNEL}

EXAMPLE COMMAND
Type : /menu
    `;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('Chaine Telegram', TG_CHANNEL)],
        [Markup.button.url('Groupe Telegram', TG_GROUP)],
        [Markup.button.url('Chaine WhatsApp', WA_CHANNEL)],
        [Markup.button.url('Groupe WhatsApp', WA_GROUP)],
        [Markup.button.url('Contact Auteur', AUTHOR_LINK)],
    ]);
    await sendImageWithText(ctx, BOT_IMAGE, msg, keyboard);
});

bot.command('menu', async (ctx) => {
    await react(ctx, '📋');
    const menu = `
KIRA TECH BOT
Auteur : Mr kira tech
Prefix : [ . ]

GROUP
.antilink  .goodbye  .ppgroup  .groupinfo
.groupname  .kick  .purge  .link
.listadmin  .mute  .promote  .tag
.tagall  .unmute  .welcome

FUN
.blague  .character  .compliment  .dare
.fact  .flirt  .gif  .goodnight
.meme  .news  .quote  .roseday
.ship  .stupid  .trivia  .truth  .valentine

GENERAL
.alive  .antidelete  .channelid  .fancy
.gpstatus  .menu  .owner  .pair
.pingFR  .repo  .voice

TOOLS
.fakechat  .supportban  .checkban  .banbot

> Power by KIRA & EGO tech
    `;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('Chaine Telegram', TG_CHANNEL)],
        [Markup.button.url('Chaine WhatsApp', WA_CHANNEL)],
    ]);
    await sendImageWithText(ctx, MENU_IMAGE, menu, keyboard);
});

bot.command('help', async (ctx) => {
    await react(ctx, '❓');
    const help = `
AIDE KIRA TECH BOT

Commandes principales :
/start - Bienvenue
/menu - Toutes les commandes
/help - Cette aide
/ping - Test de latence
/date - Date actuelle
/section - Sections du bot
/auteur - Infos auteur
/owner - Owner
/channel - Liens
/blague - 10 blagues
/song <titre> - Musique
/google <q> - Recherche Google
/supportban - Support ban

Admin :
/promote /kick /()}mute /unmute

Liens :
Telegram : ${TG_CHANNEL}
Groupe TG : ${TG_GROUP`,}
WhatsApp : ${WA_CHANNEL}
    `;
    await ctx.reply(help, { parse_mode: 'Mark {down', disable_web_page_preview: true });
});

bot.command('ping', async (ctx) => {
    await react(ctx parse, '🏓');
    const start = Date.now();
    const sent = await ctx.reply('Pong...');
    const latency_mode = 
