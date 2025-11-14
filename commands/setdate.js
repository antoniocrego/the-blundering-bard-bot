const { SlashCommandBuilder } = require('discord.js');
const { loadCampaignCalendarWithStructure, saveCampaignCalendar, setDate, weekdayFor } = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdate')
    .setDescription('Set a campaign to a specific date')
    .addStringOption(o => o.setName('campaign').setDescription('campaign name').setRequired(true))
    .addIntegerOption(o => o.setName('year').setDescription('year').setRequired(true))
    .addIntegerOption(o => o.setName('monthindex').setDescription('month index (0 = first)').setRequired(true))
    .addIntegerOption(o => o.setName('day').setDescription('day in month').setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('campaign').toLowerCase();
    const year = interaction.options.getInteger('year');
    const monthIndex = interaction.options.getInteger('monthindex');
    const day = interaction.options.getInteger('day');

    const c = loadCampaignCalendarWithStructure(name);
    if (!c) return interaction.reply({ content: `Campaign ${name} not found.`, ephemeral: true });

    try {
      setDate(c, year, monthIndex, day);
      saveCampaignCalendar(name, c);
      const monthName = c.months[c.monthIndex].name;
      const { name: weekdayName } = weekdayFor(c);
      await interaction.reply(`✅ ${name} set to ${c.day} ${monthName}, Year ${c.year} — **${weekdayName}**`);
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
