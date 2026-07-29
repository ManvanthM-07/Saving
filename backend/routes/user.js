import { Router } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { checkAndUpdateGoalStatus } from '../utils/calculations.js';

const router = Router();

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('monthlyIncome').optional().isFloat({ min: 0 }).withMessage('Monthly income must be a positive number'),
  body('monthlySavingsGoal').optional().isFloat({ min: 0 }).withMessage('Monthly savings goal must be a positive number'),
];

router.patch('/profile', updateProfileValidation, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { name, monthlyIncome, monthlySavingsGoal } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (monthlyIncome !== undefined) updateData.monthlyIncome = monthlyIncome;
  if (monthlySavingsGoal !== undefined) updateData.monthlySavingsGoal = monthlySavingsGoal;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      monthlyIncome: true,
      monthlySavingsGoal: true,
      savingStreak: true,
    },
  });

  await checkAndUpdateGoalStatus(userId);

  res.json({
    user: {
      ...user,
      monthlyIncome: Number(user.monthlyIncome),
      monthlySavingsGoal: Number(user.monthlySavingsGoal),
    },
    message: 'Profile updated successfully',
  });
}));

export default router;
