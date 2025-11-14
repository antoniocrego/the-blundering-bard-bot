-- Supabase Database Setup for Blundering Bard Bot
-- Run this SQL in your Supabase SQL Editor

-- Create structures table
CREATE TABLE IF NOT EXISTS structures (
    name TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    name TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the Gehenna calendar structure
INSERT INTO structures (name, data) VALUES (
    'gehenna',
    '{
        "months": [
            { "name": "Luminara", "length": 44 },
            { "name": "Pandemonis", "length": 45 },
            { "name": "Cinderveil", "length": 41 },
            { "name": "Bishamon", "length": 45 },
            { "name": "Regnum", "length": 45 },
            { "name": "Jovialis", "length": 45 },
            { "name": "Tempestra", "length": 40 },
            { "name": "Oddleap", "length": 40 },
            { "name": "Pantheonix", "length": 52 }
        ],
        "weekdays": ["Nephira", "Tartalion", "Chronor", "Zephyris", "Azuran", "Barnadun", "Mythorian"],
        "starting_weekday": 0
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Create an index for faster campaign lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(name);
CREATE INDEX IF NOT EXISTS idx_structures_name ON structures(name);
