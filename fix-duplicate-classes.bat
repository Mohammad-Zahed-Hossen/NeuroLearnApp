@REM @echo off
@REM echo Fixing duplicate masked-view classes...

@REM echo Step 1: Cleaning node_modules...
@REM rmdir /s /q node_modules 2>nul

@REM echo Step 2: Cleaning package-lock.json...
@REM del package-lock.json 2>nul

@REM echo Step 3: Cleaning Android build...
@REM if exist android (
@REM     cd android
@REM     call gradlew.bat clean 2>nul
@REM     cd ..
@REM )

@REM echo Step 4: Reinstalling dependencies...
@REM npm install

@REM echo Step 5: Clearing Metro cache...
@REM npx expo start --clear --no-dev --minify

@REM echo Done! Duplicate class issue should be resolved.
