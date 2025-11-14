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

    if (loadCampaignCalendar(name)) {
      return interaction.reply({ content: `A campaign named **${name}** already exists.`, ephemeral: true });
    }

    createCampaignCalendar(name, {
      year: 1,
      monthIndex: 0,
      day: 1,
      months: [
        { name: 'Primus', length: 30 },
        { name: 'Secundus', length: 30 },
        { name: 'Tertius', length: 30 }
      ],
      weekdays: ['Sol', 'Lun', 'Mar', 'Mer', 'Jov', 'Ven'],
      startingWeekday: 0
    });

    await interaction.reply(`🌟 Campaign **${name}** created (3×30-day months, 6-day week).`);
  }
};
