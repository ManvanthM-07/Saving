import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'studentsaver-access-secret-key-12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'studentsaver-refresh-secret-key-12345';

export function generateAccessToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export async function storeRefreshToken(userId, token) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}

export async function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

export async function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function revokeAllUserRefreshTokens(userId) {
  return prisma.refreshToken.deleteMany({
    where: { userId },
  });
}
