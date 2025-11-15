// lib/scheduler-renderer.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('./scheduler-db'); // your existing DB helper module (must export getPoll, getTallies, setPollMessageForDay, getPollMessageForDay, toISODate, etc.)

const TIMES = [12,13,14,15,16,17,18,19,20]; // CEST hours
const MAX_BUTTONS_PER_ROW = 5; // Discord limit

function formatNiceDate(d) {
  return d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'short' });
}

/**
 * Build a single "hour" button that represents all votes for that hour.
 * customId: slot__<pollId>__<dayIndex>__<hour>
 */
function buildHourButton(pollId, dayIndex, hour, counts = { yes:0, partial:0, no:0 }) {
  const uid = `slot__${pollId}__${dayIndex}__${hour}`;
  const label = `${String(hour).padStart(2,'0')}:00 — ✅${counts.yes} ◒${counts.partial} ❌${counts.no}`;
  // We use Secondary style for neutral display. (We can't style per-user in message render.)
  return new ButtonBuilder()
    .setCustomId(uid)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);
}

// /**
//  * Build nav row (single bottom row) — keep compact
//  */
// function buildNavRow(pollId, dayIndex) {
//   return new ActionRowBuilder().addComponents(
//     new ButtonBuilder().setCustomId(`nav_prev__${pollId}__${dayIndex}`).setLabel('◀ Prev').setStyle(ButtonStyle.Primary),
//     new ButtonBuilder().setCustomId(`nav_today__${pollId}__${dayIndex}`).setLabel('🏠 Today').setStyle(ButtonStyle.Secondary),
//     new ButtonBuilder().setCustomId(`nav_next__${pollId}__${dayIndex}`).setLabel('Next ▶').setStyle(ButtonStyle.Primary)
//   );
// }

/**
 * Build ActionRows (max 5 rows) for a specific day: chunk hour buttons into rows of up to 5 buttons.
 * Returns { rows } where rows is array of ActionRowBuilder.
 */
function buildHourRows(pollId, dayIndex, tallies) {
  // array of ButtonBuilder
  const buttons = TIMES.map(hour => {
    const counts = tallies?.[hour] ?? { yes:0, partial:0, no:0 };
    return buildHourButton(pollId, dayIndex, hour, counts);
  });

  // chunk into rows of up to MAX_BUTTONS_PER_ROW
  const rows = [];
  for (let i = 0; i < buttons.length; i += MAX_BUTTONS_PER_ROW) {
    const slice = buttons.slice(i, i + MAX_BUTTONS_PER_ROW);
    rows.push(new ActionRowBuilder().addComponents(slice));
  }

  // ensure we don't exceed 4 rows so nav row can be appended (max 5)
  // With 9 buttons and MAX_BUTTONS_PER_ROW=5 we get 2 rows; safe.
  return rows;
}

/**
 * Render a single day's embed + components (does NOT send).
 * @param client - discord client (only used to check accessibility sometimes)
 * @param poll - poll row (must include poll.week_start)
 * @param dayIndex - 0..6
 */
async function renderDay(client, poll, dayIndex) {
  // compute date string for DB tallies
  const dayDate = new Date(poll.week_start);
  dayDate.setDate(dayDate.getDate() + dayIndex);
  const dateStr = db.toISODate ? db.toISODate(dayDate) : dayDate.toISOString().slice(0,10);

  // fetch tallies for the day (hour -> {yes,partial,no})
  const tallies = await db.getTallies(poll.id, dateStr);

  // Embed
  const embed = new EmbedBuilder()
    .setTitle(`📅 ${formatNiceDate(dayDate)} — ${poll.week_start} → ${poll.week_end}`)
    .setDescription(`Campaign role: <@&${poll.role_id}>\nTimes shown in CEST (hours). Click an hour to cycle your vote for that slot.`)
    .setColor(0x00a2ff);

  // Build hour rows (chunked)
  const hourRows = buildHourRows(poll.id, dayIndex, tallies);

//   // Navigation row
//   const navRow = buildNavRow(poll.id, dayIndex);

  // Combine (ensure total rows <= 5)
  const components = [...hourRows].slice(0, 5);

  return { embed, components, dayDate, dateStr };
}

/**
 * Send one message per day (Mon → Sun) for the poll.
 * Stores message IDs per day via db.setPollMessageForDay(pollId, dayIndex, messageId).
 */
async function sendPollMessagesPerDay(client, pollId) {
  const poll = await db.getPoll(pollId);
  if (!poll) throw new Error('poll not found');

  const messages = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const { embed, components, dayDate } = await renderDay(client, poll, dayIndex);
    const channel = await client.channels.fetch(poll.channel_id);
    
    const content = dayIndex === 0 ? `<@&${poll.role_id}> Weekly availability poll` : undefined;

    const m = await channel.send({ content, embeds: [embed], components });
    await db.setPollMessageForDay(pollId, dayIndex, m.id);
    messages.push(m);
  }

  return messages;
}
/**
 * Update a specific day's message. If `message` is provided it edits it directly.
 * Otherwise it looks up the stored message id for that poll/day and fetches it.
 */
async function updatePollMessage(client, pollId, dayIndex, message = null) {
  const poll = await db.getPoll(pollId);
  if (!poll) throw new Error('poll not found');

  const { embed, components } = await renderDay(client, poll, dayIndex);

  if (message) {
    return message.edit({ embeds: [embed], components });
  }

  // get message id from DB
  const messageId = await db.getPollMessageForDay(pollId, dayIndex);
  if (!messageId) throw new Error('message id for this poll/day not found');

  const guild = await client.guilds.fetch(poll.guild_id);
  const channel = await guild.channels.fetch(poll.channel_id);
  const m = await channel.messages.fetch(messageId);
  return m.edit({ embeds: [embed], components });
}

module.exports = {
  renderDay,
  sendPollMessagesPerDay,
  updatePollMessage
};
