export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class QuotaExceededError extends AppError {
  public readonly limit: number;
  public readonly used: number;
  public readonly resource: string;

  constructor(resource: string, limit: number, used: number) {
    super(
      `${resource} quota exceeded: ${used}/${limit}`,
      429,
      'RATE_LIMIT_EXCEEDED',
    );
    this.resource = resource;
    this.limit = limit;
    this.used = used;
  }
}

export class LLMError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string, statusCode = 502) {
    super(message, statusCode, 'LLM_UNAVAILABLE');
    this.provider = provider;
  }
}
