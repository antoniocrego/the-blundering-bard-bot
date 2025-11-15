// lib/scheduler-db.js
const { getSupabaseClient } = require('./db');

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function upsertScheduler({ guildId, channelId, roleId }) {
  const { data, error } = await getSupabaseClient()
    .from('schedulers')
    .upsert({ guild_id: guildId, channel_id: channelId, role_id: roleId, active: true }, { onConflict: 'guild_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getScheduler(guildId) {
  const { data, error } = await getSupabaseClient().from('schedulers').select('*').eq('guild_id', guildId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

async function getSchedulerForRole(guildId, roleId) {
  const { data, error } = await getSupabaseClient().from('schedulers').select('*').eq('guild_id', guildId).eq('role_id', roleId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

async function listSchedulers() {
  const { data, error } = await getSupabaseClient().from('schedulers').select('*').eq('active', true);
  if (error) throw error;
  return data || [];
}

async function removeScheduler(guildId) {
  const { error } = await getSupabaseClient().from('schedulers').delete().eq('guild_id', guildId);
  if (error) throw error;
}

async function createPollRow({ guildId, channelId, roleId, weekStartDate }) {
  const weekStart = toISODate(weekStartDate);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekEnd = toISODate(weekEndDate);

  const { data, error } = await getSupabaseClient()
    .from('polls')
    .insert([{ guild_id: guildId, channel_id: channelId, role_id: roleId, week_start: weekStart, week_end: weekEnd }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function setPollMessageId(pollId, messageId) {
  const { error } = await getSupabaseClient().from('polls').update({ message_id: messageId }).eq('id', pollId);
  if (error) throw error;
}

async function getPoll(pollId) {
  const { data, error } = await getSupabaseClient().from('polls').select('*').eq('id', pollId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

/* votes */
async function upsertVote({ pollId, userId, date, hour, vote }) {
  if (!['yes','partial','no'].includes(vote)) throw new Error('invalid vote');
  const { error } = await getSupabaseClient()
    .from('poll_votes')
    .upsert({ poll_id: pollId, user_id: userId, date, hour, vote }, { onConflict: ['poll_id', 'user_id', 'date', 'hour'] });
  if (error) throw error;
}

async function removeVotesForUserDay(pollId, userId, date) {
  const { error } = await getSupabaseClient().from('poll_votes').delete().match({ poll_id: pollId, user_id: userId, date });
  if (error) throw error;
}

async function getTallies(pollId, date) {
  const { data, error } = await getSupabaseClient()
    .from('poll_votes')
    .select('hour, vote')
    .eq('poll_id', pollId)
    .eq('date', date);
  if (error) throw error;
  const map = {};
  for (const r of (data || [])) {
    if (!map[r.hour]) map[r.hour] = { yes:0, partial:0, no:0 };
    map[r.hour][r.vote] = (map[r.hour][r.vote] || 0) + 1;
  }
  return map;
}

async function setPollMessageForDay(pollId, dayIndex, messageId) {
  const { error } = await getSupabaseClient()
    .from('poll_messages')
    .upsert({ poll_id: pollId, day_index: dayIndex, message_id: messageId }, { onConflict: ['poll_id', 'day_index'] });
  if (error) throw error;
}

async function getPollMessageForDay(pollId, dayIndex) {
  const { data, error } = await getSupabaseClient()
    .from('poll_messages')
    .select('message_id')
    .eq('poll_id', pollId)
    .eq('day_index', dayIndex)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? data.message_id : null;
}

async function getLatestPollForRole(guildId, roleId) {
  const { data } = await getSupabaseClient()
    .from('polls')
    .select('*')
    .eq('guild_id', guildId)
    .eq('role_id', roleId)
    .order('week_start', { ascending: false })
    .limit(1)
    .single();
  return data;
}



module.exports = {
  upsertScheduler,
  getScheduler,
  listSchedulers,
  removeScheduler,
  createPollRow,
  setPollMessageId,
  getPoll,
  upsertVote,
  removeVotesForUserDay,
  getTallies,
  toISODate,
  setPollMessageForDay,
  getPollMessageForDay,
  getLatestPollForRole,
  getSchedulerForRole
};
