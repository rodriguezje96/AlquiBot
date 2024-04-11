const PORT = 8000
const config = require('./config.json')
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express()
const chatId = config.chatId
const botToken = config.botToken
const webToScrap = config.webToScrap
const bot = new TelegramBot(botToken, { polling: true })
const mensajePrueba = 'Hola! Soy el Bot de Alquileres y estoy probando si esto funca'

// Parámetros de búsqueda predeterminados
let maxPrice = 600000;
let location = 'capital-federal';

// Proceso lo que manda el usuario por el chat
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const command = msg.text.toLowerCase();

    // Procesar comandos de búsqueda
    if (command.startsWith('/setmaxprice')) {
        const newMaxPrice = parseInt(command.split(' ')[1]);
        if (!isNaN(newMaxPrice)) {
            maxPrice = newMaxPrice;
            bot.sendMessage(chatId, `Max price set to: $${maxPrice}`);
            // Ejecutar el proceso de scraping con los nuevos parámetros
            scrapeData();
        } else {
            bot.sendMessage(chatId, 'Revisá lo que mandaste y poné bien el número.');
        }
    } else if (command.startsWith('/setlocation')) {
        const newLocation = command.split(' ')[1];
        if (newLocation) {
            location = newLocation;
            bot.sendMessage(chatId, `Location set to: ${location}`);
            // Ejecutar el proceso de scraping con los nuevos parámetros
            scrapeData();
        } else {
            bot.sendMessage(chatId, 'Ese barrio no lo conozco, probá con otro');
        }
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
    const webToScrap = `https://www.argenprop.com/departamentos-o-ph/alquiler/${location}?con-ambiente-balcon&con-permitemascotas&hasta-${maxPrice}-pesos`;
    // Aquí implementa el código de scraping con los parámetros actuales
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

            // Enviar las oportunidades por Telegram
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