@echo off
title DWG-PDF Converter - Celery Worker
cd /d "C:\xampp\htdocs\dwg-pdf-converter\python_service"
echo Starting Celery Worker...
echo.
C:\xampp\htdocs\dwg-pdf-converter\.venv\Scripts\python.exe -m celery -A celery_app worker --loglevel=info --pool=solo
pause
