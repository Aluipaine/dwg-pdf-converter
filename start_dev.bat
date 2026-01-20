@echo off
title DWG-PDF Converter - Node.js Server
cd /d "C:\xampp\htdocs\dwg-pdf-converter"
set NODE_ENV=development
echo Starting Node.js Development Server...
echo.
call node node_modules\.pnpm\tsx@4.20.6\node_modules\tsx\dist\cli.mjs watch server/_core/index.ts
pause
