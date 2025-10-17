# NeuroLearn App - Installation Guide

## 📋 Prerequisites

Before installing NeuroLearn, ensure you have the following:

### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Expo CLI**: Latest version
- **Git**: For cloning the repository

### Development Environment
- **iOS Development**: Xcode 14+ (macOS only)
- **Android Development**: Android Studio with SDK 33+
- **Web Development**: Modern web browser

## 🚀 Quick Start Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/neurolearn-app.git
cd neurolearn-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Run the automated setup script
npm run setup-env

# Or manually create .env file with required variables
cp .env.example .env
```

### 4. Supabase Setup (Optional but Recommended)
```bash
# Deploy Supabase functions
npm run setup-backend

# Or follow the detailed Supabase setup guide
# See docs/SUPABASE_SETUP.md
```

### 5. Start Development Server
```bash
npm start
```

### 6. Run on Device/Emulator
```bash
# iOS Simulator
npm run ios

# Android Emulator/Device
npm run android

# Web Browser
npm run web
```

## 🔧 Detailed Setup Instructions

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration (Optional)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Todoist Integration (Optional)
EXPO_PUBLIC_TODOIST_CLIENT_ID=your_todoist_client_id
EXPO_PUBLIC_TODOIST_CLIENT_SECRET=your_todoist_client_secret

# Notion Integration (Optional)
EXPO_PUBLIC_NOTION_CLIENT_ID=your_notion_client_id
EXPO_PUBLIC_NOTION_CLIENT_SECRET=your_notion_client_secret

# OpenAI API (Optional - for AI features)
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

### Audio Assets Setup

The app includes pre-configured audio assets. To validate them:

```bash
npm run validate-audio-assets
```

If you need to regenerate audio files:

```bash
npm run generate-audio-files
```

### Build Configuration

#### Android Build
```bash
# Prebuild and fix Gradle issues
npm run prebuild-android

# Build debug APK
npm run android-build

# Build release APK
npm run build:ci
```

#### iOS Build
```bash
# Prebuild
npx expo prebuild --platform ios

# Build with EAS
eas build --platform ios
```

#### Web Build
```bash
# Build for web
npx expo export --platform web
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Audio Validation
```bash
npm run check-soundscapes
```

### Pre-build Checks
```bash
npm run prebuild-check
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Metro Bundler Issues
```bash
# Clear cache
npx expo start --clear

# Reset Metro cache
npx react-native start --reset-cache
```

#### 2. Android Build Issues
```bash
# Fix Gradle duplicates
npm run fix-android-dup

# Clean Android build
cd android && ./gradlew clean
```

#### 3. Audio Loading Issues
```bash
# Validate audio assets
npm run validate-audio

# Regenerate audio guide
npm run generate-audio-guide
```

#### 4. Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure Row Level Security is configured

### Performance Issues

#### Large Mind Maps
- The app automatically optimizes for large graphs
- Enable performance mode in settings
- Consider reducing node count for better performance

#### Memory Usage
- Close unused screens
- Restart app periodically
- Monitor memory usage in development

## 📱 Device-Specific Setup

### iOS Setup
1. Install Xcode from App Store
2. Accept Xcode license: `sudo xcodebuild -license accept`
3. Install iOS Simulator
4. Run: `npm run ios`

### Android Setup
1. Install Android Studio
2. Set up Android SDK (API 33+)
3. Configure environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. Run: `npm run android`

### Web Setup
1. Ensure modern browser (Chrome 90+, Firefox 88+, Safari 14+)
2. Some features may be limited on web (camera, native audio)
3. Run: `npm run web`
### ⚙️ Building and Running the Dev Client
Use the unified Node script:
```bash
npm run dev:client

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use environment-specific Supabase projects
- Rotate API keys regularly
- Enable Row Level Security in Supabase

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Supabase Documentation](https://supabase.com/docs)
- [NeuroLearn App Documentation](./docs/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the [Comprehensive Implementation Report](./docs/COMPREHENSIVE_IMPLEMENTATION_REPORT.md)
3. Check existing GitHub issues
4. Create a new issue with detailed error logs

## ✅ Verification Checklist

After installation, verify:

- [ ] App starts without errors
- [ ] All screens load properly
- [ ] Audio assets load correctly
- [ ] Navigation works smoothly
- [ ] Cognitive features adapt to load
- [ ] Offline functionality works
- [ ] Tests pass (optional)

---

**Installation completed!** 🎉

The NeuroLearn app should now be running with all features enabled. Explore the cognitive training tools, neural mind mapping, and adaptive soundscapes to enhance your learning experience.
