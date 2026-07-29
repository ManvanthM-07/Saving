import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getMonthlyAnalytics, getCategoryDistribution, getMonthStart, getMonthEnd } from '../utils/calculations.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const now = new Date();

  const history = await getMonthlyAnalytics(userId, 6);
  const categories = await getCategoryDistribution(userId, getMonthStart(now), getMonthEnd(now));

  res.json({
    history,
    categories,
  });
}));

export default router;
