// commands/scheduler.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../lib/scheduler-db');
const renderer = require('../lib/scheduler-renderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scheduler')
    .setDescription('Configure weekly availability polls')
    .addSubcommand(sc =>
      sc.setName('setup')
        .setDescription('Set scheduler for this guild (defaults to current channel)')
        .addMentionableOption(o => o.setName('ping').setDescription('Role to ping').setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post polls (defaults to this channel)').setRequired(false))
    )
    .addSubcommand(sc => sc.setName('trigger').setDescription('Create and post the poll for next week immediately')
        .addMentionableOption(o => o.setName('role').setDescription('Role to trigger the scheduler for').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('remove').setDescription('Remove scheduler for this guild'))
    .addSubcommand(sc => sc.setName('summary').setDescription('Get the current results for the latest availability poll for a role')
        .addMentionableOption(o => o.setName('role').setDescription('Role to check results for').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const role = interaction.options.getMentionable('ping');
        if (!role || !role.id) return interaction.editReply('Please supply a role to ping.');
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;

        await db.upsertScheduler({ guildId: interaction.guildId, channelId: channel.id, roleId: role.id });
        return interaction.editReply(`✅ Scheduler saved for <#${channel.id}>, pinging <@&${role.id}> each Saturday.`);
      } catch (err) {
        console.error('scheduler setup', err);
        return interaction.editReply('Failed to configure scheduler.');
      }
    }

    if (sub === 'trigger') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const role = interaction.options.getMentionable('role');
        if (!role || !role.id) return interaction.editReply('Please specify a role to trigger the scheduler for.');

        const sched = await db.getScheduler(interaction.guildId, role.id);
        if (!sched) return interaction.editReply(`No scheduler configured for <@&${role.id}>.`);

        // compute next Monday
        const now = new Date();
        const day = now.getDay();
        const daysUntilNextMonday = ((8 - day) % 7) || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() + daysUntilNextMonday);
        monday.setHours(0,0,0,0);

        // create poll row in DB
        const poll = await db.createPollRow({
          guildId: sched.guild_id,
          channelId: sched.channel_id,
          roleId: sched.role_id,
          weekStartDate: monday
        });

        // send one message per day (Mon -> Sun). renderer will persist per-day message IDs.
        await renderer.sendPollMessagesPerDay(client, poll.id);

        return interaction.editReply(`✅ Poll created & posted in <#${sched.channel_id}> for <@&${sched.role_id}>.`);
      } catch (err) {
        console.error('scheduler trigger', err);
        return interaction.editReply('Failed to trigger poll.');
      }
    }

    if (sub === 'remove') {
      await interaction.deferReply({ ephemeral: true });
      try {
        await db.removeScheduler(interaction.guildId);
        return interaction.editReply('✅ Scheduler removed for this guild.');
      } catch (err) {
        console.error('scheduler remove', err);
        return interaction.editReply('Failed to remove scheduler.');
      }
    }

    if (sub === 'summary'){
        await interaction.deferReply();
        try {
        const role = interaction.options.getMentionable('role');
        if (!role?.id) return interaction.editReply('Please specify a valid role.');

        // fetch the latest poll for that role in this guild
        const poll = await db.getLatestPollForRole(interaction.guildId, role.id);
        if (!poll) return interaction.editReply(`No poll found for <@&${role.id}>.`);

        // fetch tallies for each day
        const weekStart = new Date(poll.week_start);
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            return date;
        });

        const TIMES = [12,13,14,15,16,17,18,19,20];
        let description = '';

        for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
            const date = days[dayIndex];
            const dateStr = db.toISODate(date);
            const tallies = await db.getTallies(poll.id, dateStr); // hour -> {yes, partial, no}
            description += `**${date.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'short' })}**\n`;
            for (const hour of TIMES) {
            const t = tallies[hour] || { yes:0, partial:0, no:0 };
            description += `\`${String(hour).padStart(2,'0')}:00\` ✅${t.yes} 🟨${t.partial} ❌${t.no}\n`;
            }
            description += '\n';
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 Availability summary for <@&${role.id}>`)
            .setDescription(description)
            .setColor(0x00a2ff)
            .setFooter({ text: `Week starting ${weekStart.toLocaleDateString()}` });

        await interaction.editReply({ embeds: [embed] });

        } catch (err) {
        console.error('scheduler-summary', err);
        await interaction.editReply('Failed to fetch poll summary.');
        }
    }
  }
};
