# 🚀 NeuroLearn Migration Guide: AsyncStorage → Supabase

This guide walks you through migrating your NeuroLearn app from local AsyncStorage to Supabase cloud backend.

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Node.js**: Version 16 or higher
3. **Existing NeuroLearn App**: With local data to migrate

## 🛠️ Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name (e.g., "neurolearn-app")
3. Set a strong database password
4. Select a region close to your users
5. Wait for the project to be created (~2 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Update Supabase Configuration

1. Open `src/services/SupabaseService.ts`
2. Replace the placeholder values:

```typescript
// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 4. Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL to create all tables and policies

### 5. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 6. Test the Migration

1. Start your app: `npm start`
2. You'll see the authentication screen
3. Create a new account or sign in
4. The migration screen will appear automatically
5. Click "Start Migration" to transfer your data

## 🔄 Migration Process

The migration happens in these steps:

1. **Authentication**: User signs up/in to Supabase
2. **Data Detection**: App checks for local AsyncStorage data
3. **Migration Screen**: Shows progress and benefits
4. **Data Transfer**: Moves all data to Supabase tables:
   - User settings → `user_profiles`
   - Flashcards → `flashcards`
   - Logic nodes → `logic_nodes`
   - Focus sessions → `focus_sessions`
   - Reading sessions → `reading_sessions`
   - Neural logs → `neural_logs`
5. **Verification**: Confirms all data transferred successfully

## 🔒 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Secure token-based authentication
- **Encrypted Storage**: All data encrypted at rest
- **API Key Protection**: Anon key only allows authenticated operations

## 🎯 Benefits After Migration

### ✨ New Features Unlocked:
- **Cross-device sync**: Access your data on any device
- **AI-powered insights**: Advanced analytics and recommendations
- **Real-time collaboration**: Share study sessions with others
- **Automatic backups**: Never lose your learning progress
- **Enhanced performance**: Faster queries and better caching

### 📊 Data Improvements:
- **Relational queries**: Complex data relationships
- **Full-text search**: Search across all your content
- **Advanced filtering**: Filter by date, category, performance
- **Data export**: Easy backup and portability

## 🔧 Troubleshooting

### Migration Fails
- Check your internet connection
- Verify Supabase credentials are correct
- Ensure you have sufficient Supabase storage quota
- Try the migration again (it's safe to retry)

### Authentication Issues
- Check if email verification is required
- Verify your Supabase project is active
- Ensure RLS policies are properly set up

### Data Not Syncing
- Check if you're authenticated
- Verify RLS policies allow your operations
- Check browser console for error messages

### Performance Issues
- Ensure indexes are created (run the schema again)
- Check your Supabase project's resource usage
- Consider upgrading your Supabase plan if needed

## 🚨 Important Notes

### Data Safety
- **Local data is preserved** during migration
- Migration can be retried if it fails
- You can continue using local storage if migration fails
- Original AsyncStorage data remains untouched

### Rollback Plan
If you need to rollback to local storage:
1. The app automatically falls back to AsyncStorage if Supabase is unavailable
2. Your original local data is never deleted during migration
3. You can disable Supabase by signing out

### Free Tier Limits
Supabase free tier includes:
- 500MB database storage
- 2GB bandwidth per month
- 50,000 monthly active users
- 500,000 Edge Function invocations

## 🎉 Post-Migration

After successful migration:

1. **Test all features** to ensure everything works
2. **Explore new AI features** in the app
3. **Set up cross-device sync** by signing in on other devices
4. **Configure backup preferences** in Settings
5. **Invite friends** to collaborate on learning goals

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify your Supabase project configuration
4. Check the app logs for detailed error information

## 🔄 Future Updates

The migration system supports:
- **Incremental updates**: Only new/changed data is synced
- **Conflict resolution**: Handles data conflicts intelligently
- **Schema evolution**: Automatic database schema updates
- **Feature flags**: Gradual rollout of new features

---

**🎯 Ready to migrate?** Start your app and follow the guided migration process!

**🔒 Your data security is our priority.** All migrations are encrypted and follow industry best practices.