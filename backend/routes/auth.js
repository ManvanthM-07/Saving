import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { generateAccessToken, generateRefreshToken, storeRefreshToken, revokeAllUserRefreshTokens, verifyRefreshToken } from '../lib/jwt.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 409, { email: ['This email is already in use'] });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, monthlyIncome: true, monthlySavingsGoal: true, createdAt: true },
  });

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);
  await storeRefreshToken(user.id, refreshToken);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    user,
    accessToken,
    message: 'Registration successful',
  });
}));

router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);
  await storeRefreshToken(user.id, refreshToken);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      monthlyIncome: Number(user.monthlyIncome),
      monthlySavingsGoal: Number(user.monthlySavingsGoal),
      savingStreak: user.savingStreak,
      avatarUrl: user.avatarUrl,
    },
    accessToken,
    message: 'Login successful',
  });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    throw new AppError('Refresh token required', 401);
  }

  const isValid = await verifyRefreshToken(refreshToken);
  if (!isValid) {
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored) {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: isValid.userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await prisma.refreshToken.delete({ where: { token: refreshToken } });

  const newAccessToken = generateAccessToken(user.id, user.email);
  const newRefreshToken = generateRefreshToken(user.id, user.email);
  await storeRefreshToken(user.id, newRefreshToken);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken: newAccessToken });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  if (req.user?.userId) {
    await revokeAllUserRefreshTokens(req.user.userId);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.json({ message: 'Logged out successfully' });
}));

router.get('/me', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      provider: true,
      monthlyIncome: true,
      monthlySavingsGoal: true,
      savingStreak: true,
      lastGoalCompleted: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    user: {
      ...user,
      monthlyIncome: Number(user.monthlyIncome),
      monthlySavingsGoal: Number(user.monthlySavingsGoal),
    },
  });
}));

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
], asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  res.json({ message: 'If the email exists, a reset link has been sent' });
}));

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], asyncHandler(async (req, res) => {
  res.json({ message: 'Password reset functionality requires email service integration' });
}));

export default router;
