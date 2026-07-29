import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getCurrentMonthSummary } from '../utils/calculations.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const summary = await getCurrentMonthSummary(userId);

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const achievements = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
  });

  res.json({
    summary,
    notifications,
    achievements,
  });
}));

export default router;
