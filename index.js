const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { listCampaignCalendars, listCalendarStructures } = require('./lib/calendar.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

const autocompleteSources = {
    campaign: listCampaignCalendars,
    structure: listCalendarStructures
}

client.on('interactionCreate', async (interaction) => {
    console.log("interaction received")
    if (interaction.isAutocomplete()){
        const focusedOption = interaction.options.getFocused(true);
        const optionName = focusedOption.name;
        const typed = focusedOption.value;

        const fetcher = autocompleteSources[optionName];
        if (!fetcher) return; // nothing to suggest

        const items = await fetcher(); // array of strings
        const choices = items
            .filter(item => item.toLowerCase().includes(typed.toLowerCase()))
            .slice(0, 25)
            .map(item => ({ name: item, value: item }));

        await interaction.respond(choices);
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);
        interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);