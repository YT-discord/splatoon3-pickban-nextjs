@echo off

cd ../client
echo Building and starting frontend...
start cmd /k "npm run dev || (echo Frontend failed to build or start & pause)"
cd ../server
echo Starting backend...
start cmd /k "ts-node app.ts || (echo Backend failed to start & pause)"
cd ../common