const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabaseClient() {
    if (!supabase) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
        }
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
    return supabase;
}

async function loadCalendarStructure(name){
    const { data, error } = await getSupabaseClient()
    .from('structures')
    .select('data')
    .eq('name', name)
    .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data?.data ?? null; // data column is jsonb
}

async function loadCampaignCalendarStructure(campaign_json){
    if (!campaign_json?.structure) return null;
    return await loadCalendarStructure(campaign_json.structure);
}

async function loadCampaignCalendar(name){
    const { data, error } = await getSupabaseClient()
    .from('campaigns')
    .select('data')
    .eq('name', name)
    .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data?.data ?? null; // data column is jsonb
}

async function loadCampaignCalendarWithStructure(name){
    const campaign_json = await loadCampaignCalendar(name);
    const structure_json = await loadCampaignCalendarStructure(campaign_json);
    if (!campaign_json || !structure_json) return null;
    return { ...campaign_json, ...structure_json };
}

async function saveCampaignCalendar(name, obj){
    // check in case we're receiving a composite calendar from loadCampaignCalendarWithStructure
    const campaignObj = {
        structure: obj.structure,
        day: obj.day,
        monthIndex: obj.monthIndex,
        year: obj.year
    };
    
    const { error } = await getSupabaseClient()
    .from('campaigns')
    .upsert({ name, data: campaignObj }, { onConflict: 'name' });

    if (error) throw error;
    return "Saved campaign " + name + " calendar successfully!";
}

async function createCampaignCalendar(name, opts = {}){
    if (opts.structure && !(await loadCalendarStructure(opts.structure)))
        return "You must first define calendar structure " + opts.structure + "!";

    const campaignObj = {
        structure: opts.structure ?? 'gehenna',
        year: opts.year ?? 1,
        monthIndex: opts.monthIndex ?? 0,
        day: opts.day ?? 1
    }

    // return success message
    return await saveCampaignCalendar(name, campaignObj);
}

function createCalendarStructure(name, opts = {}){
    const structureObj = {
        months: opts.months ?? [{ name: "Defaultio Monthio"}]
    }
    // TODO
}

/**
 * Total days elapsed from some fixed epoch to the given date in this campaign
 * We'll count days from year 0, month 0, day 1 as day 0 baseline for weekday math.
 */
function totalDaysForDate(campaignObj) {
    const months = campaignObj.months;
    const yearLength = months.reduce((s, m) => s + m.length, 0);

    // days from full past years
    const daysFromYears = (campaignObj.year) * yearLength;

    // days from past months of current year
    let daysFromMonths = 0;
    for (let i = 0; i < campaignObj.monthIndex; i++) {
        daysFromMonths += months[i].length;
    }

    // days from current day (we'll treat day 1 as +0 offset)
    const daysFromDays = (campaignObj.day - 1);

    const total = daysFromYears + daysFromMonths + daysFromDays;
    return total;
}

/**
 * Get weekday name for the campaign's current date according to a structure.
 */
function weekdayFor(campaignObj) {
    const total = totalDaysForDate(campaignObj);

    const startingWeekday = campaignObj.startingWeekday || 0;
    const idx = (startingWeekday + total) % campaignObj.weekdays.length;
    return {
        index: idx,
        name: campaignObj.weekdays[idx]
    };
}

/**
 * Advance a campaign by n days (n >= 0). Returns new campaign object.
 */
function advanceByDays(campaignObj, n) {
    if (n < 0) throw new Error('n must be non-negative');

    // flatten into total days, add n, then reconstruct year/month/day
    const months = campaignObj.months;
    const yearLength = months.reduce((s, m) => s + m.length, 0);

    // compute current absolute total days
    let total = totalDaysForDate(campaignObj);
    total += n;

    // compute new year
    const newYear = Math.floor(total / yearLength);

    let dayOfYear = total % yearLength; // 0-based
    // find monthIndex and day
    let acc = 0;
    let newMonthIndex = 0;
    let newDay = 1;
    for (let i = 0; i < months.length; i++) {
    if (dayOfYear < acc + months[i].length) {
        newMonthIndex = i;
        newDay = dayOfYear - acc + 1; // convert 0-based -> 1-based
        break;
    }
    acc += months[i].length;
    }

    campaignObj.year = newYear;
    campaignObj.monthIndex = newMonthIndex;
    campaignObj.day = newDay;
    return campaignObj;
}

/**
 * Helper to set date directly (validates ranges)
 * Assumes campaignObj derives from loadCampaignCalendarWithStructure
 */
function setDate(campaignObj, year, monthIndex, day) {
    if (monthIndex < 0 || monthIndex >= campaignObj.months.length) {
        throw new Error('invalid monthIndex');
    }
    if (day < 1 || day > campaignObj.months[monthIndex].length) {
        throw new Error('invalid day for month');
    }
    campaignObj.year = year;
    campaignObj.monthIndex = monthIndex;
    campaignObj.day = day;
    return campaignObj;
}

/**
 * List calendar structures
 */
async function listCalendarStructures(){
    const { data, error } = await getSupabaseClient()
        .from('structures')
        .select('name');
    
    if (error) throw error;
    return data ? data.map(row => row.name) : [];
}

/**
 * List a specific calendar structure
 */
function listCalendarStructure(){
    // TODO
}

/**
 * List campaign calendars
 */
async function listCampaignCalendars(){
    const { data, error } = await getSupabaseClient()
        .from('campaigns')
        .select('name');
    
    if (error) throw error;
    return data ? data.map(row => row.name) : [];
}

/**
 * Get current 8-phase moon states for a campaign.
 */
function getMoonPhases(campaignObj) {
    const totalDays = totalDaysForDate(campaignObj);
    const campaignMoons = campaignObj.moons || [];

    return campaignMoons.map(moon => {
        const cycle = Math.max(1, moon.cycleLength || 28);
        const offset = moon.offset ? (moon.offset % cycle + cycle) % cycle : 0;

        const dayInCycle = (totalDays + offset) % cycle;
        const percent = dayInCycle / cycle;

        // 8 phases → equal slices of the cycle
        const phaseIndex = Math.floor(percent * 8) % 8;
        const phaseInfo = PHASE_EMOJIS[phaseIndex];

        return {
            name: moon.name,
            emoji: phaseInfo.emoji,
            phase: phaseInfo.name,   // e.g. "Waxing Gibbous"
            percent,                 // 0.0 → 1.0
            dayInCycle,
            rawIndex: phaseIndex     // 0–7
        };
    });
}

/**
 * Gets the current date, weekday, and moon phase for a campaig
 */
function getCurrentDate(campaignObj) {
    const monthName = campaignObj.months[campaignObj.monthIndex].name;
    const { name : weekdayName } = weekdayFor(campaignObj);

    const phases = getMoonPhases(campaignObj);

    // Build the moon phase block
    const moonLines = phases
        .map(m => `• ${m.emoji} **${m.name}** — ${m.phase} (${(m.percent * 100).toFixed(1)}%)`)
        .join('\n');


    // Build final output
    return (
        `**${weekdayName}**, ${campaignObj.day} of ${monthName}, Year ${campaignObj.year}

    🌙 **Moon Phases**
    ${moonLines}`
    );
}


/**
 * Map 8-phase index -> emoji + short name
 */
const PHASE_EMOJIS = [
  { emoji: '🌑', name: 'New' },
  { emoji: '🌒', name: 'Waxing Crescent' },
  { emoji: '🌓', name: 'First Quarter' },
  { emoji: '🌔', name: 'Waxing Gibbous' },
  { emoji: '🌕', name: 'Full' },
  { emoji: '🌖', name: 'Waning Gibbous' },
  { emoji: '🌗', name: 'Last Quarter' },
  { emoji: '🌘', name: 'Waning Crescent' }
];

function getMoonPhaseForTotal(totalDays, moon) {
    const cycle = Math.max(1, moon.cycleLength || 28);
    const offset = moon.offset ? (moon.offset % cycle + cycle) % cycle : 0;
    const dayInCycle = (totalDays + offset) % cycle;
    const phaseCount = PHASE_EMOJIS.length;
    const phaseIndex = Math.floor((dayInCycle / cycle) * phaseCount) % phaseCount;
    const percent = dayInCycle / cycle;
    return { ...PHASE_EMOJIS[phaseIndex], percent, rawIndex: phaseIndex, dayInCycle };
}

/**
 * generateMonthView(structure, campaign, targetYear, targetMonthIndex)
 * - structure: object with months[], weekdays[], starting_weekday (optional), moons[] (optional)
 * - campaign: object with year, monthIndex, day (used to highlight current day)
 *
 * Returns string (no code block) — caller should wrap in triple-backticks as desired.
 */
function generateMonthView(structure, campaign, targetYear, targetMonthIndex) {
    const months = structure.months;
    const weekdays = structure.weekdays;
    const startingWeekday = structure.startingWeekday ?? 0;

    if (!Array.isArray(months) || !Array.isArray(weekdays)) {
    throw new Error('Invalid calendar structure for generateMonthView');
    }

    const month = months[targetMonthIndex];
    const daysInMonth = month.length || month.length === 0 ? month.length : month.days || 30;
    const cols = weekdays.length;

    // helper to get totalDays for arbitrary date in this structure
    function totalDaysFor(structYear, structMonthIndex, structDay) {
        const fake = {
            year: structYear,
            monthIndex: structMonthIndex,
            day: structDay,
            months: months,
            weekdays: weekdays,
            starting_weekday: startingWeekday
        };
        return totalDaysForDate(fake);
    }

    // weekday index (0..cols-1) of day 1 of target month
    const firstTotal = totalDaysFor(targetYear, targetMonthIndex, 1);
    const firstWeekdayIndex = (startingWeekday + firstTotal) % cols;

    // is this the campaign's current month? (for highlighting)
    const isCurrentMonth = campaign.year === targetYear && campaign.monthIndex === targetMonthIndex;
    const currentDay = isCurrentMonth ? campaign.day : null;

    // header (weekday names)
    const header = weekdays.map(w => w.padEnd(3, ' ').slice(0,3)).join(' ');

    // Build rows: fixed cell width 4 (3 chars + spacer) to keep alignment
    // cell content: either " DD" or "[DD]" (current) optionally + moon emoji trimmed to 1 char (we append emoji in same 4-char cell)
    const CELL_WIDTH = 4; // approx

    // Start building lines
    const lines = [];
    let line = '';
    // pad first week
    for (let i = 0; i < firstWeekdayIndex; i++) {
    line += ' '.repeat(CELL_WIDTH);
    }

    for (let d = 1; d <= daysInMonth; d++) {
    // compute totalDays for this specific date
    const total = totalDaysFor(targetYear, targetMonthIndex, d);

    // moon emojis: take first moon's emoji for the day or multiple if you want (limit width)
    let moonChar = ' ';
    if (Array.isArray(structure.moons) && structure.moons.length > 0) {
        // pick first moon (or you could combine)
        const moonPhases = structure.moons.map(m => getMoonPhaseForTotal(total, m));
        // choose representation: primary moon emoji (first)
        moonChar = moonPhases[0].emoji || ' ';
    }

    let cell;
    if (d === currentDay) {
        // highlighted
        const num = d.toString().padStart(2, ' ');
        // "[DD]" is 4 chars; we'll drop moon emoji when highlighted for alignment
        cell = `[${num}]`;
    } else {
        const num = d.toString().padStart(2, ' ');
        // place number and moon emoji (e.g. " 1🌕")
        const combined = `${num}${moonChar}`;
        // ensure length CELL_WIDTH: pad to right
        cell = combined.padEnd(CELL_WIDTH, ' ');
    }

    line += cell;

    // If end of week, push line and reset
    const weekdayIndex = (firstWeekdayIndex + d - 1) % cols;
    if (weekdayIndex === cols - 1) {
        lines.push(line);
        line = '';
    }
    }

    // push remaining
    if (line.trim().length > 0) lines.push(line);

    // assemble output: title line, header, divider, then lines
    const title = `${month.name}, Year ${targetYear}`;
    const divider = '-'.repeat(Math.max(header.length, 10));

    const body = [title, header, divider, ...lines].join('\n');

    return body;
}

module.exports = {
    loadCalendarStructure,
    loadCampaignCalendarStructure,
    loadCampaignCalendar,
    loadCampaignCalendarWithStructure,
    saveCampaignCalendar,
    createCampaignCalendar,
    createCalendarStructure,
    totalDaysForDate,
    weekdayFor,
    advanceByDays,
    setDate,
    listCalendarStructures,
    listCalendarStructure,
    listCampaignCalendars,
    getMoonPhases,
    getCurrentDate,
    generateMonthView
}