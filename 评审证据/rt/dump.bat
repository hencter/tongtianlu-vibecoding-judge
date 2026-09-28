@echo off
set CHROME=C:\Users\hencter\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe
set OUT=%~1
set URL=%~2
set PROF=%~3
if "%PROF%"=="" set PROF=d:\WorkBuddy\通天路闪电赛评委委员会\rt\cprofx
if exist "%PROF%" rmdir /s /q "%PROF%"
"%CHROME%" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --disable-extensions --user-data-dir="%PROF%" --virtual-time-budget=10000 --dump-dom "%URL%" > "%OUT%" 2> "%OUT%.err"
echo EXIT=%ERRORLEVEL% >> "%OUT%.err"
