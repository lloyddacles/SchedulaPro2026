/**
 * ApiError.ts
 * 
 * Standardized error class for the Faculty Scheduling System.
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details: any;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, code: string = 'INTERNAL_ERROR', details: any = null, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
