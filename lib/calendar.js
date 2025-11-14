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
 * Get current moon phases for a specific campaign
 */
function getMoonPhases(campaignObj){
    const totalDays = totalDaysForDate(campaignObj);
    const campaignMoons = campaignObj.moons;

    return campaignMoons.map(moon => {
        const dayInCycle = (totalDays + (moon.offset || 0)) % moon.cycleLength;
        const phasePercent = dayInCycle / moon.cycleLength; // 0.0 → 1.0
        let phaseName;

        if (phasePercent < 0.125 || phasePercent >= 0.875) phaseName = "New Moon";
        else if (phasePercent < 0.375) phaseName = "First Quarter";
        else if (phasePercent < 0.625) phaseName = "Full Moon";
        else phaseName = "Last Quarter";

        return {
            name: moon.name,
            phase: phaseName,
            percent: phasePercent
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
        .map(m => `• **${m.name}** — ${m.phase} (${(m.percent * 100).toFixed(1)}%)`)
        .join('\n');

    // Build final output
    return (
        `**${weekdayName}**, ${campaignObj.day} of ${monthName}, Year ${campaignObj.year}

    🌙 **Moon Phases**
    ${moonLines}`
    );
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
    getCurrentDate
}