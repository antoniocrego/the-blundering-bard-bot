const { SlashCommandBuilder } = require('discord.js');
const { createCampaignCalendar, loadCampaignCalendar } = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcampaign')
    .setDescription('Create a new campaign calendar')
    .addStringOption(opt => opt.setName('name').setDescription('campaign name').setRequired(true))
    .addStringOption(opt =>
      opt.setName('structure')
         .setDescription('Calendar structure for this campaign')
         .setRequired(true)
         .setAutocomplete(true)
    ),
  async execute(interaction) {
    const raw = interaction.options.getString('name');
    //const name = raw.toLowerCase().replace(/\s+/g, '_');
    const structure = interaction.options.getString('structure');

    if (await loadCampaignCalendar(raw)) {
      return interaction.reply({ content: `A campaign named **${raw}** already exists.`, ephemeral: true });
    }

    try {
      const json = {
        structure: structure,
        year: 1,
        monthIndex: 0,
        day: 1
      }

      const result = await createCampaignCalendar(raw, json);

      if (typeof result === 'string' && result.includes('must first define')) {
        return interaction.reply({ content: `❌ ${result}`, ephemeral: true });
      }

      await interaction.reply(`🌟 Campaign **${raw}** created with **${structure}** calendar structure.`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      return interaction.reply({ content: `❌ Error creating campaign: ${err.message}`, ephemeral: true });
    }
  }
};
