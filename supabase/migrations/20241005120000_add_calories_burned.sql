-- Add calories_burned column to workout_logs table
ALTER TABLE workout_logs
ADD COLUMN IF NOT EXISTS calories_burned INTEGER;
