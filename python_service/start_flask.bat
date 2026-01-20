@echo off
echo Starting Flask API Server...
cd /d "%~dp0"
"C:\xampp\htdocs\dwg-pdf-converter\.venv\Scripts\python.exe" api_server.py
pause
