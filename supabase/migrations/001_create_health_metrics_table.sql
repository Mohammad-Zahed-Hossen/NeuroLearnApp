-- Create the health_metrics table
CREATE TABLE IF NOT EXISTS public.health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sleep_hours DECIMAL(4,2) DEFAULT 8.0,
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    workout_intensity INTEGER CHECK (workout_intensity >= 0 AND workout_intensity <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    heart_rate_avg INTEGER,
    steps INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    recovery_score INTEGER CHECK (recovery_score >= 1 AND recovery_score <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own health metrics" ON public.health_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health metrics" ON public.health_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health metrics" ON public.health_metrics
    FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_health_metrics_updated_at
    BEFORE UPDATE ON public.health_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON public.health_metrics(user_id, date DESC);
