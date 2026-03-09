import { Request, Response, NextFunction } from 'express';

/**
 * Enhanced error handler that prevents information disclosure
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the full error server-side (never expose this to clients)
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  const status = err.status || err.statusCode || 500;

  // Generic error messages for production
  const productionMessages: { [key: number]: string } = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };

  // Prepare response
  const response: any = {
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? productionMessages[status] || 'An error occurred'
      : err.message,
  };

  // In development, include more details
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details || undefined;
  }

  // ✅ FIX: Check if headers already sent before responding
  if (res.headersSent) {
    console.error('Headers already sent, cannot send error response. Delegating to next error handler.');
    return next(err);
  }

  // Send response
  res.status(status).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    path: req.path,
  });
}

/**
 * Async route handler wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Security logging middleware
 */
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const sensitiveActions = [
    '/api/login',
    '/api/register',
    '/api/logout',
    '/api/user/delete',
    '/api/organizations',
  ];

  if (sensitiveActions.some(path => req.path.includes(path))) {
    console.log('Security Event:', {
      action: req.method + ' ' + req.path,
      ip: req.ip,
      user: (req as any).user?.id || 'anonymous',
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
