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

const port = process.env.PORT || 3000;

function startServer() {
    const app = express();
    app.use(express.json());

    app.post('/share', (req, res) => {
        const payload = req.body;
        
        client.getChats()
        .then(chats => {

            const chatId =  getReceiverChat(chats, payload);
            client.sendMessage(chatId, payload.message)
            .then(message => successResponse(payload, res, message))
            .catch(error => {
                console.log("ERROR SENDING MESSAGE")
                errorResponse(payload, res, error)});

        })
        .catch(error => {
            console.log("ERROR GETTING CHATS ");
            console.log(error);
            errorResponse(payload, res, error)});
    });

    app.listen(port, () => {
        console.log(`SERVER STARTED ON PORT ${port}`);
    });
}

function getReceiverChat(chats, payload) {
    let chatId;
    let chat;
    if(payload.receiverType === 'GROUP') {
        chat = chats.find(chat => chat.isGroup && chat.name === payload.receiver);
    } else if (payload.receiverType === 'CONTACT') {
        chat = chats.find(chat => !chat.isGroup && chat.name === payload.receiver);
    } else {
        const phoneNumber = getSanitizedPhoneNumber(payload.receiver);
        chat = chats.find(chat => !chat.isGroup && chat.id.user === phoneNumber);
    }

    if(chat) {
        chatId = chat.id._serialized;
    }

    if(!chatId) {
        let newPhoneNumber = payload.receiver;

        if(newPhoneNumber.charAt(0) === '+') {
            newPhoneNumber = payload.receiver.substring(1)
        }

        newPhoneNumber = getSanitizedPhoneNumber(payload.receiver);

        if(!isNaN(newPhoneNumber)) {
            chatId = newPhoneNumber + "@c.us";
        }
    }

    return chatId;
}

function getSanitizedPhoneNumber(receiver) {
    if(receiver.startsWith('+')){
        receiver = receiver.substr(1);
    }
    return receiver.replace(' ', '').replace('-', '');
}

function successResponse(payload, res, message) {
    res.status(201).json({ message: `Message successfully sent to ${payload.receiver}`, internalResponse: message });

}

function errorResponse(payload, res, error) {
    res.status(400).json({ error: `Error while sending message to receiver ${payload.receiver}`, internalError: error });
}

client.initialize();