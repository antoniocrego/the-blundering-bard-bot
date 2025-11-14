const { SlashCommandBuilder } = require('discord.js');
const { loadCampaignCalendarWithStructure, saveCampaignCalendar, advanceByDays, weekdayFor } = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advance')
    .setDescription('Advance a campaign by N days')
    .addStringOption(o => o.setName('campaign').setDescription('campaign name').setRequired(true).setAutocomplete(true))
    .addIntegerOption(o => o.setName('days').setDescription('number of days').setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('campaign');
    const days = interaction.options.getInteger('days');

    const c = await loadCampaignCalendarWithStructure(name);
    if (!c) return interaction.reply({ content: `Campaign ${name} not found.`, ephemeral: true });
    if (days < 0) return interaction.reply({ content: 'Days must be >= 0', ephemeral: true });

    advanceByDays(c, days);
    await saveCampaignCalendar(name, c);

    const monthName = c.months[c.monthIndex].name;
    const { name: weekdayName } = weekdayFor(c);

    await interaction.reply(`⏩ Advanced **${name}** by **${days}** days. New date: ${c.day} ${monthName}, Year ${c.year} — **${weekdayName}**`);
  }
};
