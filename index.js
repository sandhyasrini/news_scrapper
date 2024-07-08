const axios = require('axios');
const cheerio = require('cheerio');
const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const dotenv = require('dotenv')

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });



let task = null;

async function fetchLatestArticles() {
    const url = 'https://tldr.tech/';
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const articles = [];

        // Extracting article titles, descriptions, and links from 'webdev' section
        $('#webdev').map((index, element) => {
            try {
                const title = $(element).find('h2').text().trim();
                const description = $(element).find('p').text().trim();
                const link = $(element).find('a').attr('href');
                articles.push({ title, description, link });
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
        const message = articles.map(article => `${article.title}\n${article.link}`).join('\n\n');
        try {
            const channel = await client.channels.fetch(process.env.CHANNEL_ID);
            if (channel) {  // Ensure the channel type is text-based
                channel.send(message);
            } else {
                console.error(`Channel ${channelId} is not a text channel.`);
            }
        } catch (error) {
            console.error(`Error fetching channel ${channelId}:`, error);
        }
    }
}

client.once('ready', async () => {
    console.log('Bot is online!');

    // Fetch and post latest articles for the first time
    await postLatestArticlesToDiscord();

    // Schedule cron job to fetch and post articles every 6 hours
    task = cron.schedule('0 */1 * * *', postLatestArticlesToDiscord, {
        scheduled: true,
    });
});

client.on('messageCreate', (message) => {
    if (message.content === '!start') {
        message.channel.send('Bot is already running and fetching articles.');
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




