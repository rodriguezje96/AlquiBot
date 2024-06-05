const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');

// Configurar dotenv
dotenv.config();

const PORT = process.env.PORT || 8000;
const botToken = process.env.BOT_TOKEN;
const webToScrap = "https://www.argenprop.com/departamentos-o-ph/alquiler/capital-federal?con-ambiente-balcon&con-permitemascotas&hasta-600000-pesos";
const botActive = process.env.BOT_ACTIVE === 'true';

if (!botToken) {
    console.error("Telegram Bot Token not provided!");
    process.exit(1);
}

const bot = new TelegramBot(botToken, { polling: true });
const app = express();

const mensajePrueba = 'Hola! Soy el Bot de Alquileres y estoy probando si esto funca';
const activeChatIds = {};

let maxPrice = null; // Variable para almacenar el precio máximo
let location = null; // Variable para almacenar la ubicación

if (botActive) {
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        activeChatIds[chatId] = true;
        const welcomeMessage = `¡Bienvenido al Bot de Alquileres! \n\n
        Este bot te ayuda a buscar alquiler de departamentos en Capital Federal. \n
        Para empezar, podés utilizar los siguientes comandos:
        - /setmaxprice [precio]: Decime el máximo de guita que podés gastar, tirate a más por las dudas.
        - /setlocation [barrio]: Si sos platudo y querés mirar por ubicación decime eso directamente. \n\n
        ¡Adelante, elegí. Estoy seguro que perderás!`;
        bot.sendMessage(chatId, welcomeMessage);
        console.log('Usuario saludado con /start');
    });

    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const command = msg.text.toLowerCase();

        if (command.startsWith('/setmaxprice')) {
            const newMaxPriceString = command.split(' ')[1];
            const newMaxPrice = parseInt(newMaxPriceString.replace(/\./g, ''));
            if (!isNaN(newMaxPrice)) {
                maxPrice = newMaxPrice;
                bot.sendMessage(chatId, `Podés gastar: $${maxPrice}`);
                scrapeData();
            } else {
                bot.sendMessage(chatId, 'Revisá lo que mandaste, solo entiendo números.');
            }
        } else if (command.startsWith('/setlocation')) {
            const newLocation = command.split(' ')[1];
            if (isNaN(newLocation)) {
                location = newLocation.toLowerCase(); // Guardar la ubicación en minúsculas
                bot.sendMessage(chatId, `Te querés mudar a: ${location}`);
                scrapeData();
            } else {
                bot.sendMessage(chatId, 'Ese barrio no lo conozco, probá con otro.');
            }
        } else if (!command.startsWith('/start')) {
            bot.sendMessage(chatId, 'No reconozco ese comando. Por favor, utilizá /start, /setmaxprice o /setlocation.');
        }
    });
}

function enviarMensaje(chatId, mensaje) {
    bot.sendMessage(chatId, mensaje)
        .then(sentMessage => {
            console.log('Mensaje enviado correctamente:', sentMessage);
        })
        .catch(error => {
            console.error('Error al enviar el mensaje:', error);
        });
}

// Función para filtrar las oportunidades según el precio máximo y la ubicación
function filtrarOportunidades(opportunities) {
    return opportunities.filter(option => {
        const price = parseInt(option.price.replace(/\$/g, ''));
        const locationMatch = location ? option.location.toLowerCase().includes(location) : true;
        const priceMatch = maxPrice ? price <= maxPrice : true;
        return locationMatch && priceMatch;
    });
}

// Armo el scraper, le digo que atributos mirar y los guardo en un JSON
function scrapeData() {
    axios.get(webToScrap)
        .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);
            const opportunities = [];
            $('.listing__item').each(function () {
                const title = $(this).find('.card__title--primary').text().trim();
                const price = $(this).find('.card__price').text().trim().replace(/\./g, '').replace(/\$/g, '');
                const expensas = $(this).find('.card__expenses').text().trim().replace(/\./g, '').replace(/\$/g, '');
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

            const filteredOpportunities = filtrarOportunidades(opportunities);

            // Si no encuentra nada mando un mensaje
            if (filteredOpportunities.length === 0) {
                Object.keys(activeChatIds).forEach(chatId => {
                    enviarMensaje(chatId, 'No encontré nada con lo que me pediste, probá con más guita o con otro barrio.');
                });
                return;
            }

            // Se lo mando al chat
            filteredOpportunities.forEach(option => {
                const message = `
                Title: ${option.title}
                Price: $${option.price} (Expensas: $${option.expensas})
                Location: ${option.location}
                Link: https://www.argenprop.com${option.link}
                `;
                Object.keys(activeChatIds).forEach(chatId => {
                    enviarMensaje(chatId, message);
                });
            });
            console.log('Te mandamos la datita');
        })
        .catch(error => {
            console.error('Error al chorear la data', error);
        });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});