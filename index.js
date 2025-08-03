//base by Tech-God
// YouTube: @techgod143
// GitHub: @techgod143

require('./settings')
const express = require('express')
const pino = require('pino')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const readline = require("readline")
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, getBuffer, downloadContentFromMessage } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    PHONENUMBER_MCC,
    jidDecode
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const Pino = require("pino")

// ==== Express Setup for Render ====
const app = express()
const PORT = process.env.PORT || 3000
let pairCode = "Generating..." // Global variable to show code in HTML

app.get('/', (req, res) => {
    res.send(`
    <html>
      <head>
        <title>WhatsApp Pair Code</title>
        <style>
          body { font-family: Arial; text-align: center; margin-top: 50px; background: #111; color: #fff; }
          .box { padding: 20px; background: #222; display: inline-block; border-radius: 10px; }
          h1 { color: #0f0; }
          .code { font-size: 28px; font-weight: bold; margin-top: 15px; color: #0ff; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Pairing Code</h1>
          <div class="code">${pairCode}</div>
          <p>Refresh the page if code not visible yet.</p>
        </div>
      </body>
    </html>
    `)
})
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`))

// ==== WhatsApp Bot ====
const store = require("@whiskeysockets/baileys").makeInMemoryStore({ logger: pino({ level: 'silent' }) })
let phoneNumber = process.env.NUMBER || "911234567890"
const pairingCodeFlag = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startBot() {
    let { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const msgRetryCounterCache = new NodeCache()

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCodeFlag,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: { creds: state.creds, keys: require("@whiskeysockets/baileys").makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" })) },
        markOnlineOnConnect: true,
        msgRetryCounterCache
    })

    store.bind(sock.ev)

    if (pairingCodeFlag && !sock.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')

        let num = phoneNumber.replace(/[^0-9]/g, '')
        if (!Object.keys(PHONENUMBER_MCC).some(v => num.startsWith(v))) {
            console.log(chalk.redBright("Start with country code, e.g: +916909137213"))
            process.exit(0)
        }

        setTimeout(async () => {
            let code = await sock.requestPairingCode(num)
            code = code?.match(/.{1,4}/g)?.join("-") || code
            pairCode = code // update global variable for HTML
            console.log(chalk.bgGreen(`Your Pairing Code:`), chalk.white(code))
        }, 3000)
    }

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            const m = smsg(sock, mek, store)
            require("./XeonBug5")(sock, m, chatUpdate, store) // Import external commands as is
        } catch (err) {
            console.log(err)
        }
    })

    sock.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s
        if (connection == "open") {
            console.log(chalk.green(`✅ Connected as ${sock.user.name}`))
        }
        if (connection === "close" && lastDisconnect?.error?.output?.statusCode != 401) {
            startBot()
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startBot()

// Auto reload on file change
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})
