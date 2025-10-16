#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running pre-build checks...\n');

let allChecksPassed = true;

const checks = [
  {
    name: 'Environment Variables',
    check: () => {
      const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY'];
      const missing = required.filter(key => !process.env[key]);
      if (missing.length > 0) {
        console.log(`❌ Missing environment variables: ${missing.join(', ')}`);
        return false;
      }
      console.log('✅ All required environment variables found');
      return true;
    }
  },
  {
    name: 'Audio Assets Validation',
    check: () => {
      try {
        execSync('npm run validate-audio-assets', { stdio: 'pipe' });
        console.log('✅ Audio assets validation passed');
        return true;
      } catch (error) {
        console.log('❌ Audio assets validation failed');
        return false;
      }
    }
  },
  {
    name: 'TypeScript Compilation',
    check: () => {
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        console.log('✅ TypeScript compilation passed');
        return true;
      } catch (error) {
        console.log('❌ TypeScript compilation failed');
        console.log(error.stdout?.toString() || error.message);
        return false;
      }
    }
  },
  {
    name: 'Supabase Connection',
    check: () => {
      // Simple check if SUPABASE_URL is a valid URL
      const url = process.env.SUPABASE_URL;
      if (!url || !url.startsWith('https://')) {
        console.log('❌ Invalid SUPABASE_URL');
        return false;
      }
      console.log('✅ Supabase URL format valid');
      return true;
    }
  }
];

checks.forEach(check => {
  if (!check.check()) {
    allChecksPassed = false;
  }
});

console.log('\n📊 PRE-BUILD CHECK SUMMARY:');
if (allChecksPassed) {
  console.log('🎉 All pre-build checks passed! Ready for build.');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above before building.');
  process.exit(1);
}
