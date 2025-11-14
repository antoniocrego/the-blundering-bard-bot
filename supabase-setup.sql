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
    'Miaom',
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
        "startingWeekday": 2,
        "moons": [
            { "name": "Luna", "cycleLength": 31, "offset": 0}
        ]
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Insert the Gregorian calendar structure
INSERT INTO structures (name, data) VALUES (
    'Gregorian',
    '{
        "months": [
            { "name": "January", "length": 31 },
            { "name": "February", "length": 28 },
            { "name": "March", "length": 31 },
            { "name": "April", "length": 30 },
            { "name": "May", "length": 31 },
            { "name": "June", "length": 30 },
            { "name": "July", "length": 31 },
            { "name": "August", "length": 31 },
            { "name": "September", "length": 30 },
            { "name": "October", "length": 31 },
            { "name": "November", "length": 30 },
            { "name": "December", "length": 31 }
        ],
        "weekdays": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "startingWeekday": 0,
        "moons": [
            { "name": "The Moon", "cycleLength": 31, "offset": 0}
        ]
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;


-- Create an index for faster campaign lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(name);
CREATE INDEX IF NOT EXISTS idx_structures_name ON structures(name);
