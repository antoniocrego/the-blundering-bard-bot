# The Blundering Bard Bot

## Overview

The Blundering Bard Bot is a Discord bot designed for managing custom D&D campaign calendars. It provides slash commands for creating campaigns, advancing dates, and tracking time within custom calendar systems. The bot uses Discord.js for Discord integration and Supabase as its cloud database for persistent storage of calendar structures and campaign data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

**Problem**: Need to organize a Discord bot with multiple slash commands and calendar management logic.

**Solution**: Command pattern with modular file structure:
- `index.js` - Main bot entry point handling Discord client setup and command routing
- `deploy-commands.js` - Separate script for registering slash commands with Discord API
- `commands/` - Directory containing individual command modules (addcampaign, advance, date, setdate, listcampaigns)
- `lib/calendar.js` - Core calendar logic and database operations
- `calendars/` - JSON files for local calendar structure definitions

**Rationale**: Separation of concerns allows easy addition of new commands without modifying core bot logic. Each command is self-contained with its own execute function.

### Discord Integration

**Problem**: Interface with Discord servers using modern Discord API standards.

**Solution**: Discord.js v14 with slash commands (application commands)
- Uses `GatewayIntentBits.Guilds` for minimal permission footprint
- Commands registered globally via Discord REST API
- Interaction-based command execution pattern

**Why Slash Commands**: Modern Discord standard providing better UX with auto-completion and type validation compared to prefix-based commands.

### Data Persistence

**Problem**: Store calendar structures and campaign dates persistently across bot restarts.

**Solution**: Supabase (PostgreSQL) as cloud database with two-table schema:
- `structures` table - Stores calendar definitions (months, weekdays, starting weekday)
- `campaigns` table - Stores individual campaign state (year, month, day, structure reference)

**Alternatives Considered**: 
- Local JSON files (currently used as fallback/migration path based on code)
- SQLite for simpler setup

**Chosen Approach Pros**: 
- Cloud-hosted, no local storage management
- Accessible from anywhere
- Free tier available
- PostgreSQL reliability

**Chosen Approach Cons**:
- Requires external service setup
- Network dependency
- Potential latency vs local storage

### Calendar Logic

**Problem**: Support custom calendar systems with varying month lengths and weekday cycles.

**Solution**: Calendar structure system with:
- Configurable month definitions (name + length in days)
- Configurable weekday names
- Day advancement algorithm that handles month/year rollovers
- Weekday calculation based on cumulative day count from epoch

**Design Pattern**: Calendar state stored as simple data objects (year, monthIndex, day) that reference a structure definition. Logic functions operate on these objects immutably where possible.

### Environment Configuration

**Problem**: Secure credential management for Discord tokens and Supabase keys.

**Solution**: `.env` file with `dotenv` package loading environment variables:
- `TOKEN` - Discord bot authentication
- `CLIENT_ID` - Discord application identifier
- `GUILD_ID` - Discord server identifier (optional for guild-specific commands)
- `SUPABASE_URL` - Supabase project endpoint
- `SUPABASE_KEY` - Supabase anonymous/public API key

**Security Note**: All sensitive credentials stored in environment variables, never committed to repository.

## External Dependencies

### Discord API
- **Service**: Discord Developer Portal
- **Purpose**: Bot authentication, slash command registration, message sending
- **Integration**: discord.js v14 library
- **Required Credentials**: Bot token, Client ID, Guild ID
- **Permissions Needed**: Send Messages, Use Slash Commands

### Supabase
- **Service**: Supabase (PostgreSQL cloud database)
- **Purpose**: Persistent storage of calendar structures and campaign states
- **Integration**: @supabase/supabase-js client library
- **Required Credentials**: Project URL, Anon/Public API key
- **Database Schema**: 
  - `structures` table with JSONB data column for calendar definitions
  - `campaigns` table with JSONB data column for campaign state
- **Setup**: Requires running `supabase-setup.sql` to initialize schema

### NPM Packages
- `discord.js` (^14.13.0) - Discord API wrapper
- `@supabase/supabase-js` (^2.81.1) - Supabase client
- `dotenv` (^16.3.1) - Environment variable management

### Pre-seeded Data
- "Gehenna" calendar structure included as default calendar system with 9 custom months and 7 weekdays
- Stored in `calendars/calendar_structures.json` for reference/migration