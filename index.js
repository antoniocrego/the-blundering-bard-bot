const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { listCampaignCalendars, listCalendarStructures, loadCampaignCalendar, loadCampaignCalendarStructure, generateMonthView } = require('./lib/calendar.js');
const fs = require('fs');
const cron = require('node-cron');
const db = require('./lib/scheduler-db');
const { getSupabaseClient } = require('./lib/db');
const renderer = require('./lib/scheduler-renderer');
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

    // start cron after ready — Saturdays 12:00 CEST
    cron.schedule('0 12 * * 6', async () => {
        console.log('[cron] run weekly schedulers');
        const scheds = await db.listSchedulers();
        for (const s of scheds) {
        try {
            // compute next Monday
            const now = new Date();
            const day = now.getDay();
            const daysUntilNextMonday = ((8 - day) % 7) || 7;
            const monday = new Date(now);
            monday.setDate(now.getDate() + daysUntilNextMonday);
            monday.setHours(0,0,0,0);

            const poll = await db.createPollRow({ guildId: s.guild_id, channelId: s.channel_id, roleId: s.role_id, weekStartDate: monday });
            await renderer.sendPollMessage(client, poll.id);
            console.log(`[cron] posted poll ${poll.id} for guild ${s.guild_id}`);
        } catch (err) {
            console.error('[cron] scheduler loop error for', s.guild_id, err);
        }
        }
    }, { timezone: 'Europe/Stockholm' });
});

const autocompleteSources = {
    campaign: listCampaignCalendars,
    structure: listCalendarStructures
}

client.on('interactionCreate', async (interaction) => {
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

    if (interaction.isButton()) {
        const id = interaction.customId;
        if (id.startsWith('cal_')){
            // id formats:
            // cal_prev__<encName>__<year>__<month>
            // cal_next__<encName>__<year>__<month>
            // cal_today__<encName>
            const parts = id.split('__');
            const action = parts[0]; // e.g. 'cal_prev' or 'cal_today' or 'cal_next'
            const encName = parts[1];
            const campaignName = decodeURIComponent(encName);

            // load current saved state
            const campaign = await loadCampaignCalendar(campaignName);
            if (!campaign) {
                return interaction.reply({ content: '❌ Campaign not found.', ephemeral: true });
            }
            const structure = await loadCampaignCalendarStructure(campaign);

            let year, monthIndex;
            if (action === 'cal_today') {
                year = campaign.year;
                monthIndex = campaign.monthIndex;
            } else {
                // parts: ['cal_prev'|'cal_next', encName, yearStr, monthStr]
                year = parseInt(parts[2], 10);
                monthIndex = parseInt(parts[3], 10);

                if (action === 'cal_prev') {
                monthIndex -= 1;
                if (monthIndex < 0) { monthIndex = structure.months.length - 1; year -= 1; }
                } else if (action === 'cal_next') {
                monthIndex += 1;
                if (monthIndex >= structure.months.length) { monthIndex = 0; year += 1; }
                }
            }

            // normalize again just in case
            while (monthIndex < 0) { monthIndex += structure.months.length; year -= 1; }
            while (monthIndex >= structure.months.length) { monthIndex -= structure.months.length; year += 1; }

            const calendarBody = generateMonthView(structure, campaign, year, monthIndex);
            const text = '```\n' + calendarBody + '\n```';

            // rebuild buttons with updated state
            const enc = encodeURIComponent(campaignName);
            const row = new (require('discord.js')).ActionRowBuilder().addComponents(
                new (require('discord.js')).ButtonBuilder().setCustomId(`cal_prev__${enc}__${year}__${monthIndex}`).setLabel('⬅️ Prev').setStyle(require('discord.js').ButtonStyle.Primary),
                new (require('discord.js')).ButtonBuilder().setCustomId(`cal_today__${enc}`).setLabel('🏠 Today').setStyle(require('discord.js').ButtonStyle.Secondary),
                new (require('discord.js')).ButtonBuilder().setCustomId(`cal_next__${enc}__${year}__${monthIndex}`).setLabel('Next ➡️').setStyle(require('discord.js').ButtonStyle.Primary)
            );

            // update the same message
            return interaction.update({ content: text, components: [row] });
        }

        if (interaction.isButton && interaction.customId.startsWith('slot__')) {
            await interaction.deferUpdate(); // keep it snappy

            // parse: slot__<pollId>__<dayIndex>__<hour>
            const parts = interaction.customId.split('__');
            const pollId = parts[1];
            const dayIndex = parseInt(parts[2], 10);
            const hour = parseInt(parts[3], 10);

            // compute date string
            const poll = await db.getPoll(pollId);
            if (!poll) return;

            const dayDate = new Date(poll.week_start);
            dayDate.setDate(dayDate.getDate() + dayIndex);
            const dateStr = db.toISODate(dayDate);

            // find current vote for this user/slot (if any)
            const currRows = await getSupabaseClient().from('poll_votes').select('vote').match({ poll_id: pollId, user_id: interaction.user.id, date: dateStr, hour });
            // safe approach using scheduler-db helper if you have getUserVote function:
            let currVote = null;
            if (currRows && Array.isArray(currRows.data) && currRows.data.length > 0) currVote = currRows["data"][0]["vote"];

            // cycle: null -> yes -> partial -> no -> null
            const cycle = [null, 'yes', 'partial', 'no'];
            let idx = cycle.indexOf(currVote);
            if (idx === -1) idx = 0;
            idx = (idx + 1) % cycle.length;
            const newVote = cycle[idx];

            if (newVote === null) {
                // delete
                await getSupabaseClient().from('poll_votes').delete().match({ poll_id: pollId, user_id: interaction.user.id, date: dateStr, hour });
            } else {
                await db.upsertVote({ pollId, userId: interaction.user.id, date: dateStr, hour, vote: newVote });
            }

            // update the day's message in-place (pass the interaction.message)
            try {
                await renderer.updatePollMessage(interaction.client, pollId, dayIndex, interaction.message);
            } catch (err) {
                console.error('Failed to update poll message after vote:', err);
            }
            return;
        }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (err) {
        console.error(err);
        interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);