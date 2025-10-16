#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up NeuroLearn environment...');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from template...');
    const envContent = `# NeuroLearn Environment Configuration

# Supabase Configuration
SUPABASE_URL=your-supabase-project-url-here
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# AI Configuration (Google Gemini)
GEMINI_API_KEY=your-google-gemini-api-key-here

# App Configuration
ENCRYPTION_KEY=your-32-character-encryption-key-here
JWT_SECRET=your-jwt-secret-key-here

# Development
NODE_ENV=development
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file. Please fill in your actual values.');
} else {
    console.log('ℹ️ .env file already exists.');
}

// Set up Supabase secrets for production
console.log('🔒 Setting up Supabase production secrets...');
console.log('Run these commands manually with your actual keys:');
console.log('');
console.log('supabase secrets set GEMINI_API_KEY=your-actual-gemini-api-key');
console.log('supabase secrets set ENCRYPTION_KEY=your-actual-encryption-key');
console.log('');

// Deploy Edge Functions
console.log('🚁 Deploying Edge Functions...');
console.log('Run these commands to deploy:');
console.log('');
console.log('supabase functions deploy ai-flashcard-creator');
console.log('supabase functions deploy ai-quiz-creator');
console.log('supabase functions deploy ai-logic-evaluator');
console.log('supabase functions deploy notion-sync-manager');
console.log('');

console.log('✅ Environment setup complete!');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Fill in your actual values in .env file');
console.log('2. Run the supabase secrets set commands above');
console.log('3. Deploy the Edge Functions with the commands above');
console.log('4. Test your setup with: npm run test:backend');



/*
To use it:

Run npm run setup-env (or node scripts/setup-env.js directly)
The script will output instructions to manually run the Supabase secrets set commands with your actual keys
It will also list the commands to deploy your Edge Functions
This helps ensure you have all the necessary setup steps listed, even if your .env is already configured.
*/




