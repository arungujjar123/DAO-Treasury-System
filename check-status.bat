@echo off
REM DAO Treasury System Quick Health Check
REM Run this file to check if everything is working

echo.
echo ========================================
echo    DAO Treasury - Quick Status Check
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js is NOT installed
    echo     Please install Node.js from https://nodejs.org/
    exit /b 1
) else (
    echo [OK] Node.js is installed
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] npm is NOT installed
    exit /b 1
) else (
    echo [OK] npm is installed
)

REM Check if package.json exists
if not exist "package.json" (
    echo [X] package.json NOT found - Are you in the project directory?
    exit /b 1
) else (
    echo [OK] package.json found
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [!] Backend dependencies NOT installed
    echo     Run: npm install
) else (
    echo [OK] Backend dependencies installed
)

REM Check if contracts are compiled
if not exist "artifacts" (
    echo [!] Contracts NOT compiled
    echo     Run: npx hardhat compile
) else (
    echo [OK] Contracts compiled
)

REM Check if contracts are deployed
if not exist "frontend\src\contracts\deployments.json" (
    echo [!] Contracts NOT deployed
    echo     Run: npm run deploy:localhost
) else (
    echo [OK] Contracts deployed
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo [!] Frontend dependencies NOT installed
    echo     Run: cd frontend ^&^& npm install
) else (
    echo [OK] Frontend dependencies installed
)

REM Check if port 8545 is in use (Hardhat node)
netstat -ano | findstr ":8545" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Hardhat node is RUNNING on port 8545
) else (
    echo [!] Hardhat node NOT running
    echo     Run: npm run node
)

REM Check if port 3000 is in use (React frontend)
netstat -ano | findstr ":3000" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] React frontend is RUNNING on port 3000
) else (
    echo [!] React frontend NOT running
    echo     Run: cd frontend ^&^& npm start
)

echo.
echo ========================================
echo        Status Check Complete
echo ========================================
echo.
echo For detailed check, run: node check-status.js
echo.

pause
