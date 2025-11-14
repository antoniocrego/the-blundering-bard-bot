const { SlashCommandBuilder } = require('discord.js');
const { loadCampaignCalendarWithStructure, weekdayFor, getCurrentDate } = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('date')
    .setDescription('Show campaign date and weekday')
    .addStringOption(opt => opt.setName('campaign').setDescription('campaign name').setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    const name = interaction.options.getString('campaign');
    const c = await loadCampaignCalendarWithStructure(name);
    if (!c) return interaction.reply({ content: `Campaign ${name} not found.`, ephemeral: true });

    const currentDateString = getCurrentDate(c);

    await interaction.reply(`📅 **${name}** — ` + currentDateString);
  }
};
