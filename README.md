# The Blundering Bard Bot

A Discord bot with a custom D&D calendar system for managing campaign dates.

## Features

- Create and manage multiple campaign calendars
- Custom calendar structures with unique months and weekdays
- Advance campaign dates by days
- Set specific dates for campaigns
- Display current campaign date and weekday
- List all campaigns

## Setup Instructions

### 1. Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the "Bot" section and click "Add Bot" if you haven't already
4. Copy your bot **TOKEN** from the Bot section
5. Go to "OAuth2" → "General" and copy your **CLIENT_ID** (Application ID)
6. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
7. Right-click your server and select "Copy Server ID" to get your **GUILD_ID**

### 2. Supabase Database Setup

1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings → API to find:
   - **SUPABASE_URL**: Your project URL
   - **SUPABASE_KEY**: Your anon/public key
4. Go to the SQL Editor and run the contents of `supabase-setup.sql` to create the required tables

### 3. Configure Environment Variables

Add the following secrets to your Replit project:
- `TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your Discord application client ID
- `GUILD_ID` - Your Discord server ID
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key

### 4. Deploy Commands to Discord

Run this command once to register the slash commands with Discord:

```bash
npm run deploy
```

### 5. Run the Bot

The bot will start automatically in Replit, or you can run:

```bash
npm start
```

## Available Commands

- `/addcampaign <name>` - Create a new campaign calendar (uses Gehenna structure by default)
- `/date <campaign>` - Show the current date and weekday for a campaign
- `/advance <campaign> <days>` - Advance a campaign's date by N days
- `/setdate <campaign> <year> <monthindex> <day>` - Set a specific date for a campaign
- `/listcampaigns` - List all campaign calendars

## Default Calendar Structure: Gehenna

The bot comes with a pre-configured calendar structure called "Gehenna":

**Months:**
- Luminara (44 days)
- Pandemonis (45 days)
- Cinderveil (41 days)
- Bishamon (45 days)
- Regnum (45 days)
- Jovialis (45 days)
- Tempestra (40 days)
- Oddleap (40 days)
- Pantheonix (52 days)

**Weekdays:** Nephira, Tartalion, Chronor, Zephyris, Azuran, Barnadun, Mythorian

**Total:** 397 days per year, 7-day weeks

## Technical Details

- Built with Discord.js v14
- Uses Supabase for persistent storage
- Written in Node.js
- Custom calendar calculation logic with weekday tracking
