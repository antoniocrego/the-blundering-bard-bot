const { SlashCommandBuilder } = require('discord.js');
const { listCampaignCalendars } = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listcampaigns')
    .setDescription('List all campaign calendars'),
  async execute(interaction) {
    const campaignCalendars = await listCampaignCalendars();

    if (campaignCalendars.length === 0) return interaction.reply('No campaigns yet.');

    const names = campaignCalendars.map(f => `• ${f}`).join('\n');
    await interaction.reply(`📚 Campaigns:\n${names}`);
  }
};
