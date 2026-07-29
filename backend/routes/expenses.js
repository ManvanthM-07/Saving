import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { getCurrentMonthSummary, checkAndUpdateGoalStatus, getMonthStart, getMonthEnd } from '../utils/calculations.js';
import { v2 as cloudinary } from 'cloudinary';

const router = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createExpenseValidation = [
  body('category').isIn(['FOOD_SNACKS', 'TRANSPORT', 'STATIONERY', 'MOVIES_ENTERTAINMENT', 'SHOPPING', 'OTHER']).withMessage('Invalid category'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description too long'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
];

const updateExpenseValidation = [
  param('id').isString().withMessage('Invalid expense ID'),
  body('category').optional().isIn(['FOOD_SNACKS', 'TRANSPORT', 'STATIONERY', 'MOVIES_ENTERTAINMENT', 'SHOPPING', 'OTHER']).withMessage('Invalid category'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description too long'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
];

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const category = req.query.category;
  const month = req.query.month;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const where = { userId };

  if (category) where.category = category;
  if (month) {
    const date = new Date(month + '-01');
    where.date = { gte: getMonthStart(date), lte: getMonthEnd(date) };
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  res.json({
    data: expenses.map(e => ({
      ...e,
      amount: Number(e.amount),
      date: e.date.toISOString().split('T')[0],
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

router.post('/', createExpenseValidation, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { category, amount, description, date } = req.body;

  const expense = await prisma.expense.create({
    data: {
      userId,
      category,
      amount,
      description,
      date: date ? new Date(date) : new Date(),
    },
  });

  await checkAndUpdateGoalStatus(userId);

  const summary = await getCurrentMonthSummary(userId);

  res.status(201).json({
    expense: { ...expense, amount: Number(expense.amount), date: expense.date.toISOString().split('T')[0] },
    summary,
    message: 'Expense added successfully',
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const expense = await prisma.expense.findFirst({
    where: { id, userId },
  });

  if (!expense) throw new AppError('Expense not found', 404);

  res.json({ ...expense, amount: Number(expense.amount), date: expense.date.toISOString().split('T')[0] });
}));

router.patch('/:id', updateExpenseValidation, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { category, amount, description, date } = req.body;

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Expense not found', 404);

  const expense = await prisma.expense.update({
    where: { id },
    data: { category, amount, description, date: date ? new Date(date) : undefined },
  });

  await checkAndUpdateGoalStatus(userId);

  const summary = await getCurrentMonthSummary(userId);

  res.json({
    expense: { ...expense, amount: Number(expense.amount), date: expense.date.toISOString().split('T')[0] },
    summary,
    message: 'Expense updated successfully',
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Expense not found', 404);

  if (existing.receiptUrl) {
    try {
      const publicId = existing.receiptUrl.split('/').pop()?.split('.')[0];
      if (publicId) await cloudinary.uploader.destroy(`studentsaver/receipts/${publicId}`);
    } catch (e) {
      console.error('Failed to delete receipt from Cloudinary:', e);
    }
  }

  await prisma.expense.delete({ where: { id } });

  await checkAndUpdateGoalStatus(userId);

  const summary = await getCurrentMonthSummary(userId);

  res.json({ summary, message: 'Expense deleted successfully' });
}));

router.post('/:id/receipt', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) throw new AppError('Expense not found', 404);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

  res.json({
    uploadUrl,
    uploadPreset: 'studentsaver_receipts',
    folder: 'studentsaver/receipts',
  });
}));

export default router;
