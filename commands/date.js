const { SlashCommandBuilder } = require('discord.js');
const { loadCampaignCalendarWithStructure, weekdayFor } = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('date')
    .setDescription('Show campaign date and weekday')
    .addStringOption(opt => opt.setName('campaign').setDescription('campaign name').setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('campaign').toLowerCase();
    const c = await loadCampaignCalendarWithStructure(name);
    if (!c) return interaction.reply({ content: `Campaign ${name} not found.`, ephemeral: true });

    const monthName = c.months[c.monthIndex].name;

    const { name: weekdayName } = weekdayFor(c);

    await interaction.reply(`📅 **${name}** — ${c.day} ${monthName}, Year ${c.year} — **${weekdayName}**`);
  }
};
