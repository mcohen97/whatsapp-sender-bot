const qrcode = require('qrcode-terminal');

const { Client, LocalAuth } = require('whatsapp-web.js');

const express = require('express');


const client = new Client({
    authStrategy: new LocalAuth({ clientId: "client-one" }),
    puppeteer: {headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']}
});


client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    startServer();
});

const port = 3000;

function startServer() {
    const app = express();
    app.use(express.json());

    app.post('/share', (req, res) => {
        console.log(req.body);
        const payload = req.body;
        
        client.getChats().then(chats => {
            const chat =  getReceiverChat(chats, payload);
            client.sendMessage(chat.id._serialized, payload.message);
        });

        res.json(req.body);
    });

    app.listen(port, () => {
        console.log('SERVER STARTED');
    });
}

function getReceiverChat(chats, payload) {
    if(payload.receiverType === 'GROUP') {
        return chats.find(chat => chat.isGroup && chat.name === payload.receiver);
    } else if (payload.receiverType === 'CONTACT') {
        return chats.find(chat => !chat.isGroup && chat.name === payload.receiver);
    } else {
        const phoneNumber = getSanitizedPhoneNumber(payload.receiver);
        return chats.find(chat => !chat.isGroup && chat.id.user === phoneNumber);
    }
}

function getSanitizedPhoneNumber(receiver) {
    if(receiver.startsWith('+')){
        receiver = receiver.substr(1);
    }
    return receiver.replace(' ', '').replace('-', '');
}

client.initialize();