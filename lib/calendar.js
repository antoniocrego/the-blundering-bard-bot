const fs = require('fs');
const path = require('path');

const CALENDAR_DIR = path.join(__dirname, '..', 'calendars');
if (!fs.existsSync(CALENDAR_DIR)) fs.mkdirSync(CALENDAR_DIR);

const CALENDAR_STRUCTURES_FILE = path.join(CALENDAR_DIR, 'calendar_structures.json');
if (!fs.existsSync(CALENDAR_DIR)) fs.writeFileSync(CALENDAR_STRUCTURES_FILE, '{}');

const CAMPAIGNS_FILE = path.join(CALENDAR_DIR, 'campaigns.json');
if (!fs.existsSync(CALENDAR_DIR)) fs.writeFileSync(CAMPAIGNS_FILE, '{}');

function loadCalendarStructure(name){
    const json = JSON.parse(fs.readFileSync(CALENDAR_STRUCTURES_FILE, 'utf8'));
    return json[name] ?? null;
}

function loadCampaignCalendarStructure(campaign_json){
    if (!campaign_json?.structure) return null;
    return loadCalendarStructure(campaign_json.structure);
}

function loadCampaignCalendar(name){
    const json = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8'));
    return json[name] ?? null;
}

function loadCampaignCalendarWithStructure(name){
    const campaign_json = loadCampaignCalendar(name);
    const structure_json = loadCampaignCalendarStructure(campaign_json);
    if (!campaign_json || !structure_json) return null;
    return campaign_json.concat(structure_json);
}

function saveCampaignCalendar(name, obj){
    let json = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8'));

    // check in case we're receiving a composite calendar from loadCampaignCalendarWithStructure
    const campaignObj = {
        structure: obj.structure,
        day: obj.day,
        monthIndex: obj.monthIndex,
        year: obj.year
    };

    json[name] = campaignObj;

    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(json, null, 2), 'utf8');

    return "Saved campaign " + name + " calendar successfully!";
}

function createCampaignCalendar(name, opts = {}){
    if (opts.structure && !loadCalendarStructure(opts.structure))
        return "You must first define calendar structure " + opts.structure + "!";

    const campaignObj = {
        structure: opts.structure ?? 'gehenna',
        year: opts.year ?? 1,
        monthIndex: opts.monthIndex ?? 0,
        day: opts.day ?? 1
    }

    // return success message
    return saveCampaignCalendar(name, campaignObj);
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

    // weekdayIndex = (startingWeekday + total) % weekdays.length
    const idx = (campaignObj.startingWeekday + total) % campaignObj.weekdays.length;
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
function listCalendarStructures(){
    const json = JSON.parse(fs.readFileSync(CALENDAR_STRUCTURES_FILE, 'utf8'));
    return Object.keys(json);
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
function listCampaignCalendars(){
    const json = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8'));
    return Object.keys(json);
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
    listCampaignCalendars
}