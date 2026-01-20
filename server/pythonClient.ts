import axios from "axios";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:5000";

export interface ConversionJobRequest {
  input_path: string;
  output_path: string;
  priority?: number;
}

export interface ConversionJobResponse {
  success: boolean;
  task_id?: string;
  message?: string;
  error?: string;
}

export interface TaskStatusResponse {
  task_id: string;
  state: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILURE";
  status?: string;
  result?: {
    success: boolean;
    output_path?: string;
    error?: string;
    processing_time_ms?: number;
  };
  meta?: {
    status: string;
    progress: number;
  };
  error?: string;
}

export interface QueueStatsResponse {
  active: number;
  scheduled: number;
  reserved: number;
  total_pending: number;
}

export class PythonConversionClient {
  private baseUrl: string;

  constructor(baseUrl: string = PYTHON_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if Python service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.data.status === "healthy";
    } catch (error) {
      console.error("[PythonClient] Health check failed:", error);
      return false;
    }
  }

  /**
   * Submit a conversion job to the queue
   */
  async submitConversion(request: ConversionJobRequest): Promise<ConversionJobResponse> {
    try {
      const response = await axios.post<ConversionJobResponse>(`${this.baseUrl}/convert`, request, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      console.error("[PythonClient] Failed to submit conversion:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Failed to submit conversion job",
      };
    }
  }

  /**
   * Get status of a conversion task
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse | null> {
    try {
      const response = await axios.get<TaskStatusResponse>(`${this.baseUrl}/status/${taskId}`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      console.error("[PythonClient] Failed to get task status:", error);
      return null;
    }
  }

  /**
   * Cancel a pending or running task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/cancel/${taskId}`, {}, { timeout: 5000 });
      return response.data.success === true;
    } catch (error) {
      console.error("[PythonClient] Failed to cancel task:", error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStatsResponse | null> {
    try {
      const response = await axios.get<QueueStatsResponse>(`${this.baseUrl}/queue/stats`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error("[PythonClient] Failed to get queue stats:", error);
      return null;
    }
  }
}

// Export singleton instance
export const pythonClient = new PythonConversionClient();
