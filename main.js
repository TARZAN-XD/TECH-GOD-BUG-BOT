// Base Modified by Assistant - Original credit: Tech-God
require('./settings');
const express = require('express');
const pino = require('pino');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ================== HTML STATIC ==================
app.use(express.static(path.join(__dirname, 'public')));

// Variable لتخزين رمز الاقتران مؤقتاً
let pairingCodeDisplay = null;

// ================== واجهة API لإرجاع رمز الاقتران ==================
app.get('/pairing-code', (req, res) => {
    res.json({ code: pairingCodeDisplay || 'لم يتم إنشاء الرمز بعد' });
});

// ================== تشغيل البوت ==================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();
    const msgRetryCounterCache = new NodeCache();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Render-Bot', 'Chrome', '1.0.0'],
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    // عند الحاجة إلى رمز الاقتران
    if (!sock.authState.creds.registered) {
        let phoneNumber = process.env.WA_NUMBER || null;
        if (!phoneNumber) {
            console.log(chalk.red('ضع رقم الواتساب في متغير البيئة WA_NUMBER (مثال: +966500000000)'));
            return;
        }
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        console.log(chalk.green(`يتم إنشاء رمز الاقتران للرقم: ${phoneNumber}`));

        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            pairingCodeDisplay = code?.match(/.{1,4}/g)?.join('-') || code;
            console.log(chalk.green(`رمز الاقتران الخاص بك: ${pairingCodeDisplay}`));
        }, 2000);
    }

    // تحميل الأوامر من الملف الأصلي
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            const XeonBug = require('./XeonBug5'); // تحميل الأوامر الأصلية
            XeonBug(sock, mek, chatUpdate);
        } catch (e) {
            console.log(chalk.red('خطأ في التعامل مع الرسائل:'), e);
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log(chalk.yellow('✅ تم الاتصال بواتساب بنجاح!'));
        } else if (connection === 'close') {
            console.log(chalk.red('❌ تم قطع الاتصال... إعادة المحاولة'));
            startBot();
        }
    });
}

startBot();

// ================== تشغيل السيرفر ==================
app.listen(PORT, () => {
    console.log(chalk.green(`✅ السيرفر يعمل على http://localhost:${PORT}`));
});
