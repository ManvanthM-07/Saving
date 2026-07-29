import { verifyAccessToken } from '../lib/jwt.js';
import { AppError } from './errorHandler.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AppError('Authentication token required', 401);
    }

    const decoded = await verifyAccessToken(token);
    if (!decoded) {
      throw new AppError('Invalid or expired authentication token', 401);
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}
