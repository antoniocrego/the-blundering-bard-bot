// commands/calendar.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
  loadCampaignCalendar,
  loadCampaignCalendarStructure,
  generateMonthView
} = require('../lib/calendar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendar')
    .setDescription('View the calendar of a campaign')
    .addStringOption(opt =>
      opt.setName('campaign')
        .setDescription('campaign name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(opt =>
      opt.setName('year')
        .setDescription('Target year (optional)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('month')
        .setDescription('Target month index (0 = first month)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const campaignName = interaction.options.getString('campaign');
    const providedYear = interaction.options.getInteger('year');
    const providedMonth = interaction.options.getInteger('month');

    const campaign = await loadCampaignCalendar(campaignName);
    if (!campaign) {
      return interaction.reply({ content: `❌ Campaign **${campaignName}** not found.`, ephemeral: true });
    }

    const structure = await loadCampaignCalendarStructure(campaign);
    if (!structure) {
      return interaction.reply({ content: `❌ Could not load calendar structure for **${campaignName}**.`, ephemeral: true });
    }

    // target year/month fallback to campaign current date
    let year = (providedYear !== null && providedYear !== undefined) ? providedYear : campaign.year;
    let monthIndex = (providedMonth !== null && providedMonth !== undefined) ? providedMonth : campaign.monthIndex;

    // normalize month/year wrap-around
    while (monthIndex < 0) { monthIndex += structure.months.length; year -= 1; }
    while (monthIndex >= structure.months.length) { monthIndex -= structure.months.length; year += 1; }

    const calendarBody = generateMonthView(structure, campaign, year, monthIndex);
    const text = '```\n' + calendarBody + '\n```';

    // encode campaign name safely into customId
    const encName = encodeURIComponent(campaignName);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cal_prev__${encName}__${year}__${monthIndex}`)
        .setLabel('⬅️ Prev')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cal_today__${encName}`)
        .setLabel('🏠 Today')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`cal_next__${encName}__${year}__${monthIndex}`)
        .setLabel('Next ➡️')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: text, components: [row] });
  }
};
