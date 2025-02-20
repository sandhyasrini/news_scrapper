const axios = require('axios');
const cheerio = require('cheerio');
const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const dotenv = require('dotenv')

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });



let task = null;

let postedArticles = new Set();
async function fetchLatestArticles() {
    const url = 'https://tldr.tech/';
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const articles = [];

        // Extracting article titles, descriptions, and links from 'webdev' section
        $('#webdev').each((index, element) => {
            try {
                $(element).find('a').each((_, anchor) => {
                    const link = $(anchor).attr('href');
                    const description = $(element).find('p').text().trim();

                    if (link && !postedArticles.has(link)) {
                        articles.push({ description, link });
                        postedArticles.add(link);

                    }
                });
            } catch (error) {
                console.error('Error extracting article:', error);
            }
        });
        return articles;
    } catch (error) {
        console.error('Error fetching articles:', error);
        return [];
    }
}

async function postLatestArticlesToDiscord() {
    const articles = await fetchLatestArticles();
    if (articles.length > 0) {
        try {
            const channel = await client.channels.fetch(process.env.CHANNEL_ID);
            if (channel) {
                for (const article of articles) {
                    if(article.description !== undefined || article.link !== undefined)
                    {
                    const message = `${article.description}\n${article.link}`;
                    await channel.send(message);
                    }
                }
            } else {
                console.error(`Channel ${process.env.CHANNEL_ID} is not a text channel.`);
            }
        } catch (error) {
            console.error(`Error fetching channel ${process.env.CHANNEL_ID}:`, error);
        }
    } else {
        console.log('No articles found.');
    }
}

client.once('ready', async () => {
    console.log('Bot is online!');

    task = cron.schedule('0 */1 * * *', postLatestArticlesToDiscord, {
        scheduled: true,
    });
});

client.on('messageCreate', async (message) => {
    if (message.content === '!start') {
        message.channel.send('Fetching latest articles...');
        await postLatestArticlesToDiscord();
    }

    if (message.content === '!stop') {
        if (task) {
            task.stop();
            task = null;
            message.channel.send('Article fetching stopped!');
        } else {
            message.channel.send('Article fetching is not running.');
        }
    }
});


client.on('error', (err) => {
    console.log("ERROR ====> ",err.message)
});

client.login(process.env.DISCORD_TOKEN);




