import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(' [CRITICAL]: JWT_SECRET is not defined in environment variables. Authentication will fail.');
}

/**
 * Middleware to authenticate JWT tokens and attach user payload to the request.
 */
export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Fallback to cookie if header is not present
  if (!token && req.cookies) {
    token = req.cookies.token;
  }
  
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  if (!JWT_SECRET) {
    return res.status(500).json({ message: 'Authentication service misconfigured' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

/**
 * Middleware to authorize specific roles.
 * Must be used AFTER authenticateToken.
 */
export const authorizeRoles = (...roles: string[]) => (req: any, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'User not authenticated' });
  
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Access denied: Insufficient permissions',
      required: roles,
      actual: req.user.role
    });
  }
  
  next();
};
