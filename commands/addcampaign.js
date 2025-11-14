const { SlashCommandBuilder } = require('discord.js');
const { createCampaignCalendar, loadCampaignCalendar } = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcampaign')
    .setDescription('Create a new campaign calendar')
    .addStringOption(opt => opt.setName('name').setDescription('campaign name').setRequired(true)),
  async execute(interaction) {
    const raw = interaction.options.getString('name');
    const name = raw.toLowerCase().replace(/\s+/g, '_');

    if (await loadCampaignCalendar(name)) {
      return interaction.reply({ content: `A campaign named **${name}** already exists.`, ephemeral: true });
    }

    try {
      const result = await createCampaignCalendar(name, {
        structure: 'gehenna',
        year: 1,
        monthIndex: 0,
        day: 1
      });

      if (typeof result === 'string' && result.includes('must first define')) {
        return interaction.reply({ content: `❌ ${result}`, ephemeral: true });
      }

      await interaction.reply(`🌟 Campaign **${name}** created with Gehenna calendar structure.`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      return interaction.reply({ content: `❌ Error creating campaign: ${err.message}`, ephemeral: true });
    }
  }
};
