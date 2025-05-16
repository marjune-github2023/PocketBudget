-- Add accessories column to tablet_history table
ALTER TABLE tablet_history
ADD COLUMN accessories JSONB DEFAULT '{}'::jsonb; 