#!/bin/bash

# NeuroLearn Environment Setup Script
# This script sets up the environment for Supabase-first architecture

echo "🚀 Setting up NeuroLearn environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Configuration (Google Gemini - NO OpenAI)
GEMINI_API_KEY=your-google-gemini-api-key

# App Configuration
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-key

# Development
NODE_ENV=development
EOF
    echo "✅ .env file created. Please fill in your actual values."
else
    echo "⚠️  .env file already exists. Skipping creation."
fi

# Create .env.example for reference
echo "📝 Creating .env.example..."
cat > .env.example << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Configuration (Google Gemini)
GEMINI_API_KEY=AIzaSyD...

# App Configuration
ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456
JWT_SECRET=your-jwt-secret-key

# Development
NODE_ENV=development
EOF

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Installing..."
    npm install -g supabase
else
    echo "✅ Supabase CLI found"
fi

# Initialize Supabase if not already done
if [ ! -f supabase/config.toml ]; then
    echo "🔧 Initializing Supabase project..."
    supabase init
else
    echo "✅ Supabase project already initialized"
fi

# Check if Edge Functions directory exists
if [ ! -d "supabase/functions" ]; then
    echo "📁 Creating Edge Functions directory..."
    mkdir -p supabase/functions
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Fill in your actual values in the .env file"
echo "2. Set production secrets: supabase secrets set GEMINI_API_KEY=your-key"
echo "3. Deploy Edge Functions: supabase functions deploy"
echo "4. Start development: npm start"
echo ""
echo "For production deployment:"
echo "- supabase secrets set GEMINI_API_KEY=your-actual-key"
echo "- supabase secrets set ENCRYPTION_KEY=your-actual-key"
echo "- supabase functions deploy ai-flashcard-creator"
echo "- supabase functions deploy ai-quiz-creator"
echo "- supabase functions deploy ai-logic-evaluator"
echo "- supabase functions deploy notion-sync-manager"