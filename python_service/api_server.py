#!/usr/bin/env python3
"""
Flask API server for DWG conversion service
Provides REST endpoints for Node.js backend to submit conversion jobs
"""

import os
import logging
from flask import Flask, request, jsonify
from celery.result import AsyncResult
from celery_app import app as celery_app, convert_file_task

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'dwg-converter',
        'version': '1.0.0'
    })


@app.route('/convert', methods=['POST'])
def submit_conversion():
    """
    Submit a conversion job to the queue
    
    Request JSON:
    {
        "input_path": "/path/to/input.dwg",
        "output_path": "/path/to/output.pdf",
        "priority": 0  // optional, higher = more important
    }
    
    Response JSON:
    {
        "success": true,
        "task_id": "abc-123-def",
        "message": "Conversion job submitted"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        input_path = data.get('input_path')
        output_path = data.get('output_path')
        priority = data.get('priority', 0)
        
        if not input_path or not output_path:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: input_path, output_path'
            }), 400
        
        # Verify input file exists
        if not os.path.exists(input_path):
            return jsonify({
                'success': False,
                'error': f'Input file not found: {input_path}'
            }), 404
        
        # Submit task to Celery queue
        task = convert_file_task.apply_async(
            args=[input_path, output_path, priority],
            priority=priority
        )
        
        logger.info(f"Submitted conversion task {task.id}: {input_path} -> {output_path}")
        
        return jsonify({
            'success': True,
            'task_id': task.id,
            'message': 'Conversion job submitted successfully'
        }), 202
        
    except Exception as e:
        logger.error(f"Error submitting conversion: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """
    Get status of a conversion task
    
    Response JSON:
    {
        "task_id": "abc-123-def",
        "state": "PENDING|PROCESSING|SUCCESS|FAILURE",
        "result": {...},  // if completed
        "meta": {...}     // progress info if processing
    }
    """
    try:
        task = AsyncResult(task_id, app=celery_app)
        
        response = {
            'task_id': task_id,
            'state': task.state
        }
        
        if task.state == 'PENDING':
            response['status'] = 'Task is waiting in queue'
        elif task.state == 'PROCESSING':
            response['status'] = 'Task is being processed'
            response['meta'] = task.info
        elif task.state == 'SUCCESS':
            response['status'] = 'Task completed successfully'
            response['result'] = task.result
        elif task.state == 'FAILURE':
            response['status'] = 'Task failed'
            response['error'] = str(task.info)
        else:
            response['status'] = task.state
            response['meta'] = task.info
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/cancel/<task_id>', methods=['POST'])
def cancel_task(task_id):
    """
    Cancel a pending or running task
    
    Response JSON:
    {
        "success": true,
        "message": "Task cancelled"
    }
    """
    try:
        task = AsyncResult(task_id, app=celery_app)
        task.revoke(terminate=True)
        
        logger.info(f"Cancelled task {task_id}")
        
        return jsonify({
            'success': True,
            'message': 'Task cancelled successfully'
        })
        
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/queue/stats', methods=['GET'])
def get_queue_stats():
    """
    Get queue statistics
    
    Response JSON:
    {
        "active": 2,
        "scheduled": 5,
        "reserved": 1
    }
    """
    try:
        inspect = celery_app.control.inspect()
        
        active = inspect.active()
        scheduled = inspect.scheduled()
        reserved = inspect.reserved()
        
        active_count = sum(len(tasks) for tasks in (active or {}).values())
        scheduled_count = sum(len(tasks) for tasks in (scheduled or {}).values())
        reserved_count = sum(len(tasks) for tasks in (reserved or {}).values())
        
        return jsonify({
            'active': active_count,
            'scheduled': scheduled_count,
            'reserved': reserved_count,
            'total_pending': active_count + scheduled_count + reserved_count
        })
        
    except Exception as e:
        logger.error(f"Error getting queue stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large errors"""
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum size is 100MB.'
    }), 413


if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_SERVICE_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
