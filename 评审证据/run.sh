#!/bin/bash
# usage: bash run.sh <port> <steps.json>
cd "d:/WorkBuddy/通天路闪电赛评委委员会" || exit 1
PORT=$1
CHROME="/c/Users/hencter/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe"
UD="C:/Users/hencter/AppData/Local/Temp/cprof_$PORT"
rm -rf "$UD" 2>/dev/null
"$CHROME" --headless=new --no-sandbox --disable-gpu --user-data-dir="$UD" \
  --remote-debugging-port=$PORT --window-size=1280,900 about:blank >/dev/null 2>&1 &
CPID=$!
for i in $(seq 1 40); do
  if curl -s --noproxy '*' "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then break; fi
  sleep 1
done
CDP_PORT=$PORT node ux_cdp.js "$2"
kill $CPID 2>/dev/null
taskkill //PID $CPID //F >/dev/null 2>&1
