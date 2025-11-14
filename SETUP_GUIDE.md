# Setup Guide for The Blundering Bard Bot

This guide will walk you through setting up your Discord bot step-by-step.

## ✅ Current Status

Your bot is **RUNNING** and the slash commands have been successfully registered with Discord!

## 🔧 Next Steps

### Step 1: Set Up Supabase Database

You need to create the database tables and seed the calendar data:

1. Log into your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `supabase-setup.sql` into the query editor
6. Click **Run** to execute the SQL script

This will create:
- A `structures` table for calendar definitions
- A `campaigns` table for storing campaign dates
- The "Gehenna" calendar structure (pre-seeded)

### Step 2: Invite the Bot to Your Discord Server

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **URL Generator**
4. Under **Scopes**, select:
   - `bot`
   - `applications.commands`
5. Under **Bot Permissions**, select:
   - Send Messages
   - Use Slash Commands
6. Copy the generated URL at the bottom
7. Open the URL in your browser and select your server
8. Click **Authorize**

### Step 3: Test the Bot

Once the bot is in your server and the database is set up, try these commands:

1. `/addcampaign name:test` - Create a new campaign called "test"
2. `/date campaign:test` - Check the current date
3. `/advance campaign:test days:5` - Advance the campaign by 5 days
4. `/listcampaigns` - See all campaigns

## 🎮 Available Commands

- `/addcampaign <name>` - Create a new campaign with the Gehenna calendar
- `/date <campaign>` - Show the current date and weekday
- `/advance <campaign> <days>` - Advance the calendar by N days
- `/setdate <campaign> <year> <monthindex> <day>` - Set a specific date
- `/listcampaigns` - List all campaigns

## 📅 Gehenna Calendar System

Your campaigns use the Gehenna calendar by default:

**Months (397 days/year):**
1. Luminara (44 days)
2. Pandemonis (45 days)
3. Cinderveil (41 days)
4. Bishamon (45 days)
5. Regnum (45 days)
6. Jovialis (45 days)
7. Tempestra (40 days)
8. Oddleap (40 days)
9. Pantheonix (52 days)

**Weekdays:** Nephira, Tartalion, Chronor, Zephyris, Azuran, Barnadun, Mythorian

## 🐛 Troubleshooting

### Bot doesn't respond to commands
- Make sure you've run the Supabase SQL setup script
- Check that the bot has permissions in your server
- Verify the bot is online (check its status in your server)

### "Campaign not found" error
- Make sure you've created the campaign first with `/addcampaign`
- Check the exact campaign name with `/listcampaigns`

### Database errors
- Verify your SUPABASE_URL and SUPABASE_KEY are correct
- Make sure you ran the SQL setup script in Supabase

## 📝 Notes

- Campaign names are automatically converted to lowercase with underscores replacing spaces
- The bot stores all data in Supabase, so it persists across restarts
- Month indices start at 0 (Luminara = 0, Pandemonis = 1, etc.)
