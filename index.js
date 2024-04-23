const PORT = 8000
const config = require('./config.json')
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express()
const botToken = "7030374684:AAF3yAFv2rEv-sXP8IfNexfklQJSupsMreQ"
const webToScrap = config.webToScrap
const bot = new TelegramBot(botToken, { polling: true })
const mensajePrueba = 'Hola! Soy el Bot de Alquileres y estoy probando si esto funca'

const activeChatIds = {}

// Parámetros de búsqueda predeterminados
let maxPrice = 600000;
let location = 'capital-federal';

// Proceso lo que manda el usuario por el chat

bot.onText(/\/start/, (msg) => {
    if (bot.onText(/\/start/)) {
        const chatId = msg.chat.id;
        activeChatIds[chatId] = true;
        const welcomeMessage = `¡Bienvenido al Bot de Alquileres! \n\n
Este bot te ayuda a  buscar alquiler de departamentos en Capital Federal. \n
Para empezar, podés utilizar los siguientes comandos:
- /setmaxprice [precio]: Decime el máximo de guita que podés gastar, tirate a más por las dudas.
- /setlocation [barrio]: Si sos platudo y querés mirar por ubicación decime eso directamente. \n\n
¡Adelante, elegí. Estoy seguro que perderás!`;
        bot.sendMessage(chatId, welcomeMessage);
        console.log('salute')
    } else {
        bot.sendMessage(chatId, 'No te entendí nada, proba con un /start')
    }
})


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const command = msg.text.toLowerCase();

    // comandos de busqueda
    if (command.startsWith('/setmaxprice')) {
        const newMaxPriceString = command.split(' ')[1];
        const newMaxPrice = parseInt(newMaxPriceString.replace(/\./g, ''));
        if (!isNaN(newMaxPrice)) {
            maxPrice = newMaxPrice;
            bot.sendMessage(chatId, `Max price set to: $${maxPrice}`);
            scrapeData();
        } else {
            bot.sendMessage(chatId, 'Revisá lo que mandaste, solo entiendo números.');
        }
    } else if (command.startsWith('/setlocation')) {
        const newLocation = command.split(' ')[1];
        if (isNaN(newLocation)) {
            location = newLocation;
            bot.sendMessage(chatId, `Location set to: ${location}`);
            scrapeData();
        }
        else {
            bot.sendMessage(chatId, 'Ese barrio no lo conozco, probá con otro');
        }
    }
    else if (command === '/start') {
        const welcomeMessage = `¡Bienvenido al Bot de Alquileres! \n\n
Este bot te ayuda a  buscar alquiler de departamentos en Capital Federal. \n
Para empezar, podés utilizar los siguientes comandos:
- /setmaxprice [precio]: Decime el máximo de guita que podés gastar, tirate a más por las dudas.
- /setlocation [barrio]: Si sos platudo y querés mirar por ubicación decime eso directamente. \n\n
¡Adelante, elegí. Estoy seguro que perderás!`;
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, welcomeMessage);
        console.log('salute')
    } else {
        bot.sendMessage(chatId, 'No te entendí nada, proba con un /start')
    }
})

function enviarMensaje(mensaje) {
    bot.sendMessage(chatId, mensaje)
        .then(sentMessage => {
            console.log('Mensaje enviado correctamente:', sentMessage);
        })
        .catch(error => {
            console.error('Error al enviar el mensaje:', error);
        });
}

//armo el scraper, le digo que atributos mirar y los guardo en un json
function scrapeData() {
    axios.get(webToScrap)
        .then(response => {
            const html = response.data
            const $ = cheerio.load(html)
            const opportunities = []
            $('.listing__item').each(function () {
                const title = $(this).find('.card__title--primary').text().trim();
                const price = $(this).find('.card__price').text().trim().replace(/\./g, '');
                const expensas = $(this).find('.card__expenses').text().trim().replace(/\./g, '');
                const location = $(this).find('.card__address').text().trim();
                const link = $(this).find('a').attr('href');

                opportunities.push({
                    title,
                    price,
                    expensas,
                    location,
                    link
                });
            });
            //Si no encuentra nada mando un mensaje
            if (opportunities.length === 0) {
                enviarMensaje('No encontré nada con lo que me pediste, probá con más guita o con otro barrio');
                return;
            }

            // Se lo mando al chat
            opportunities.forEach(option => {
                const message = `
            Title: ${option.title}
            Price: $${option.price} (Expensas: $${option.expensas})
            Location: ${option.location}
            Link: https://www.argenprop.com${option.link}
            `;
                enviarMensaje(message);
            });
            console.log('Te mandamos la datita')
        })
        .catch(error => {
            console.error('Error al chorear la data', error);
        });
}

app.listen(PORT, () => console.log(`The server is running in PORT ${PORT}`))