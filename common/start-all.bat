@echo off

cd ../client
echo Starting frontend...
start cmd /k "npm run dev || (echo Frontend failed to start & pause)"
cd ../server
echo Starting backend...
start cmd /k "ts-node app.ts || (echo Backend failed to start & pause)"