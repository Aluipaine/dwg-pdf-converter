#!/usr/bin/env python3
"""
Celery application for async DWG to PDF conversion tasks
"""

import os
import time
import logging
from celery import Celery
from converter import DWGConverter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery app
app = Celery(
    'dwg_converter',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

# Celery configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)


@app.task(bind=True, name='dwg_converter.convert_file')
def convert_file_task(self, input_path: str, output_path: str, priority: int = 0):
    """
    Celery task for converting DWG/DXF to PDF
    
    Args:
        input_path: Path to input DWG/DXF file
        output_path: Path where PDF should be saved
        priority: Task priority (higher = more important)
    
    Returns:
        dict: {
            'success': bool,
            'output_path': str or None,
            'error': str or None,
            'processing_time_ms': int
        }
    """
    start_time = time.time()
    
    try:
        logger.info(f"Starting conversion task: {input_path} -> {output_path}")
        
        # Update task state to processing
        self.update_state(
            state='PROCESSING',
            meta={'status': 'Converting file...', 'progress': 10}
        )
        
        # Verify input file exists
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Create output directory if needed
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Perform conversion
        converter = DWGConverter()
        
        self.update_state(
            state='PROCESSING',
            meta={'status': 'Processing CAD file...', 'progress': 50}
        )
        
        success, error = converter.convert_to_pdf(input_path, output_path)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        if success:
            logger.info(f"Conversion successful: {output_path} (took {processing_time_ms}ms)")
            return {
                'success': True,
                'output_path': output_path,
                'error': None,
                'processing_time_ms': processing_time_ms
            }
        else:
            logger.error(f"Conversion failed: {error}")
            return {
                'success': False,
                'output_path': None,
                'error': error,
                'processing_time_ms': processing_time_ms
            }
            
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        error_msg = f"Task exception: {str(e)}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'output_path': None,
            'error': error_msg,
            'processing_time_ms': processing_time_ms
        }


@app.task(name='dwg_converter.cleanup_old_files')
def cleanup_old_files_task(directory: str, max_age_hours: int = 24):
    """
    Cleanup old temporary files
    
    Args:
        directory: Directory to clean
        max_age_hours: Maximum age of files in hours
    """
    try:
        import time
        from pathlib import Path
        
        now = time.time()
        max_age_seconds = max_age_hours * 3600
        deleted_count = 0
        
        for file_path in Path(directory).glob('*'):
            if file_path.is_file():
                file_age = now - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    file_path.unlink()
                    deleted_count += 1
        
        logger.info(f"Cleaned up {deleted_count} old files from {directory}")
        return {'deleted_count': deleted_count}
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}")
        return {'error': str(e)}


if __name__ == '__main__':
    # Start Celery worker
    app.start()
