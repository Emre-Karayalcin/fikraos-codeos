import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Middleware to check validation results and return errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: 'param' in err ? err.param : 'unknown',
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * ✅ SECURITY FIX (P1): Escape HTML for safe use in email templates
 * Converts special characters to HTML entities to prevent injection attacks
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Password validation rules
 */
export const passwordValidation = () => [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
];

/**
 * Email validation rules
 */
export const emailValidation = (fieldName = 'email') => [
  body(fieldName)
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
];

/**
 * Username validation rules
 */
export const usernameValidation = () => [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .trim(),
];

/**
 * Registration validation
 */
export const registrationValidation = () => [
  ...usernameValidation(),
  ...emailValidation(),
  ...passwordValidation(),
  body('firstName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('First name must not exceed 100 characters')
    .trim()
    .customSanitizer(sanitizeText),
  body('lastName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Last name must not exceed 100 characters')
    .trim()
    .customSanitizer(sanitizeText),
];

/**
 * Login validation
 */
export const loginValidation = () => [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Organization/Workspace validation
 */
export const organizationValidation = () => [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters')
    .trim()
    .customSanitizer(sanitizeText),
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
    .isLength({ min: 2, max: 50 })
    .withMessage('Slug must be between 2 and 50 characters')
    .trim(),
];

/**
 * Project/Idea validation
 */
export const projectValidation = () => [
  body('title')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .trim()
    .customSanitizer(sanitizeText),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters')
    .trim()
    .customSanitizer(sanitizeHtml),
  body('type')
    .optional()
    .isIn(['RESEARCH', 'DEVELOP', 'LAUNCH'])
    .withMessage('Type must be RESEARCH, DEVELOP, or LAUNCH'),
  body('status')
    .optional()
    .isIn(['BACKLOG', 'UNDER_REVIEW', 'SHORTLISTED', 'IN_INCUBATION', 'ARCHIVED'])
    .withMessage('Invalid status'),
];

/**
 * UUID/ID validation
 */
export const uuidValidation = (paramName: string = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),
];

/**
 * File upload validation middleware
 */
export const fileUploadValidation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  // Check file size (already handled by multer, but double check)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds 2MB limit'
    });
  }

  // Check file type
  const allowedTypes = ['application/json', 'text/plain'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'Only JSON and text files are allowed'
    });
  }

  next();
};

/**
 * Query pagination validation
 */
export const paginationValidation = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
    .toInt(),
];

/**
 * URL validation
 */
export const urlValidation = (fieldName: string) => [
  body(fieldName)
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage(`${fieldName} must be a valid URL`),
];

/**
 * Challenge validation
 */
export const challengeValidation = () => [
  body('title')
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters')
    .trim()
    .customSanitizer(sanitizeText),
  body('description')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters')
    .trim()
    .customSanitizer(sanitizeHtml),
  body('slug')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
    .isLength({ min: 3, max: 100 })
    .withMessage('Slug must be between 3 and 100 characters')
    .trim(),
  body('deadline')
    .isISO8601()
    .withMessage('Deadline must be a valid date')
    .toDate(),
];
