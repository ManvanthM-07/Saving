import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const summaries = await prisma.monthlySummary.findMany({
    where: { userId },
    orderBy: { month: 'desc' },
  });

  res.json(summaries.map(s => ({
    ...s,
    income: Number(s.income),
    expenses: Number(s.expenses),
    savings: Number(s.savings),
    savingsTarget: Number(s.savingsTarget),
  })));
}));

router.post('/claim-grace', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { month } = req.body;

  if (!month) throw new AppError('Month is required', 400);

  const date = new Date(month);
  const summary = await prisma.monthlySummary.findUnique({
    where: { userId_month: { userId, month: date } },
  });

  if (!summary) throw new AppError('Summary not found', 404);
  if (summary.goalStatus !== 'GRACE_PERIOD') {
    throw new AppError('Cannot claim grace period for this month', 400);
  }

  const updated = await prisma.monthlySummary.update({
    where: { id: summary.id },
    data: {
      goalStatus: 'COMPLETED_GRACE',
      gracePeriodUsed: true,
    },
  });

  res.json({
    summary: {
      ...updated,
      income: Number(updated.income),
      expenses: Number(updated.expenses),
      savings: Number(updated.savings),
      savingsTarget: Number(updated.savingsTarget),
    },
    message: 'Grace period successfully claimed and goal marked as completed',
  });
}));

export default router;
