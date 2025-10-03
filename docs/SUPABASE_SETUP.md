# 🚀 Quick Supabase Setup Guide

## 1. **Create Supabase Project**

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Choose organization and set project name: `neurolearn-app`
4. Set strong database password
5. Select region closest to you
6. Wait 2-3 minutes for setup

## 2. **Get Your Credentials**

1. In Supabase dashboard → **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 3. **Setup Environment**

1. Create `.env` file in project root:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

2. Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 4. **Run Database Schema**

1. In Supabase dashboard → **SQL Editor**
2. Copy contents of `supabase-schema.sql`
3. Paste and click **Run**

## 5. **Test Connection**

```bash
npm install
npm start
```

1. Create account in app
2. Try migration process
3. Verify data appears in Supabase dashboard

## 🎯 **You're Ready!**

Your app now uses:
- ✅ Supabase as primary storage
- ✅ AsyncStorage as local cache
- ✅ Automatic migration system
- ✅ Row Level Security
- ✅ Real-time sync capabilities

## 🔧 **Troubleshooting**

**Migration fails?**
- Check internet connection
- Verify Supabase credentials in `.env`
- Ensure database schema was applied

**Authentication issues?**
- Check if email verification is required
- Verify project is active in Supabase dashboard

**Data not syncing?**
- Check browser console for errors
- Verify RLS policies are active
- Test with simple data first