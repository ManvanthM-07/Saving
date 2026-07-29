import { prisma } from '../lib/prisma.js';

export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getDaysRemainingInMonth(date = new Date()) {
  const endOfMonth = getMonthEnd(date);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = endOfMonth.getTime() - today.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function calculateBudgetEngine(monthlyIncome, monthlySavingsGoal, totalExpenses) {
  const spendableBudget = monthlyIncome - monthlySavingsGoal;
  const remainingBudget = Math.max(0, spendableBudget - totalExpenses);
  const daysRemaining = getDaysRemainingInMonth();
  const todaysSafeSpend = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  return {
    monthlyIncome,
    monthlySavingsGoal,
    spendableBudget,
    totalExpenses,
    remainingBudget,
    daysRemaining,
    todaysSafeSpend,
    warning80: spendableBudget * 0.8,
    warning90: spendableBudget * 0.9,
    warning100: spendableBudget,
    budgetPercentage: spendableBudget > 0 ? (totalExpenses / spendableBudget) * 100 : 0,
  };
}

export function calculateSavingsProgress(monthlyIncome, monthlySavingsGoal, totalExpenses) {
  const currentSavings = monthlyIncome - totalExpenses;
  const percentage = monthlySavingsGoal > 0 ? Math.min(100, Math.max(0, (currentSavings / monthlySavingsGoal) * 100)) : 0;
  const isGoalMet = currentSavings >= monthlySavingsGoal;
  const remainingToGoal = Math.max(0, monthlySavingsGoal - currentSavings);

  return {
    currentSavings,
    target: monthlySavingsGoal,
    percentage,
    isGoalMet,
    remainingToGoal,
  };
}

export async function getCurrentMonthSummary(userId) {
  const now = new Date();
  const monthStart = getMonthStart(now);
  const monthEnd = getMonthEnd(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { monthlyIncome: true, monthlySavingsGoal: true },
  });

  if (!user) throw new Error('User not found');

  const monthlyIncome = Number(user.monthlyIncome);
  const monthlySavingsGoal = Number(user.monthlySavingsGoal);

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
    orderBy: { date: 'desc' },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const budget = calculateBudgetEngine(monthlyIncome, monthlySavingsGoal, totalExpenses);
  const savings = calculateSavingsProgress(monthlyIncome, monthlySavingsGoal, totalExpenses);

  const categoryBreakdown = expenses.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) acc[category] = 0;
    acc[category] += Number(expense.amount);
    return acc;
  }, {});

  const categoryData = Object.entries(categoryBreakdown).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
  }));

  return {
    monthlyIncome,
    monthlySavingsGoal,
    spendableBudget: budget.spendableBudget,
    totalExpenses,
    remainingBudget: budget.remainingBudget,
    currentSavings: savings.currentSavings,
    savingsProgress: savings,
    budgetEngine: budget,
    categoryBreakdown: categoryData,
    recentTransactions: expenses.slice(0, 5).map(e => ({
      id: e.id,
      category: e.category,
      amount: Number(e.amount),
      description: e.description,
      date: e.date.toISOString().split('T')[0],
      receiptUrl: e.receiptUrl,
    })),
  };
}

export async function getMonthlyAnalytics(userId, months = 6) {
  const summaries = await prisma.monthlySummary.findMany({
    where: { userId },
    orderBy: { month: 'desc' },
    take: months,
  });

  return summaries.reverse().map(s => ({
    month: s.month.toISOString().split('T')[0],
    income: Number(s.income),
    expenses: Number(s.expenses),
    savings: Number(s.savings),
    savingsTarget: Number(s.savingsTarget),
    goalStatus: s.goalStatus,
  }));
}

export async function getCategoryDistribution(userId, monthStart, monthEnd) {
  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categories = ['FOOD_SNACKS', 'TRANSPORT', 'STATIONERY', 'MOVIES_ENTERTAINMENT', 'SHOPPING', 'OTHER'];

  return categories.map(category => {
    const amount = expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { category, amount, percentage: total > 0 ? (amount / total) * 100 : 0 };
  });
}

export async function checkAndUpdateGoalStatus(userId) {
  const now = new Date();
  const monthStart = getMonthStart(now);
  const monthEnd = getMonthEnd(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { monthlyIncome: true, monthlySavingsGoal: true, savingStreak: true },
  });

  if (!user) return;

  const monthlyIncome = Number(user.monthlyIncome);
  const monthlySavingsGoal = Number(user.monthlySavingsGoal);

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const currentSavings = monthlyIncome - totalExpenses;
  const isGoalMet = currentSavings >= monthlySavingsGoal;

  // Let's create or update the monthly summary for this month
  let summary = await prisma.monthlySummary.findUnique({
    where: { userId_month: { userId, month: monthStart } },
  });

  if (!summary) {
    summary = await prisma.monthlySummary.create({
      data: {
        userId,
        month: monthStart,
        income: monthlyIncome,
        expenses: totalExpenses,
        savings: currentSavings,
        savingsTarget: monthlySavingsGoal,
        goalStatus: isGoalMet ? 'ACHIEVED' : 'IN_PROGRESS',
      }
    });
  }

  if (isGoalMet && summary.goalStatus !== 'ACHIEVED' && summary.goalStatus !== 'COMPLETED_GRACE') {
    await prisma.monthlySummary.update({
      where: { id: summary.id },
      data: {
        goalStatus: 'ACHIEVED',
        expenses: totalExpenses,
        savings: currentSavings,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        savingStreak: { increment: 1 },
        lastGoalCompleted: now,
      },
    });

    await checkAchievements(userId, currentSavings, user.savingStreak + 1);
  } else {
    // Just update values
    await prisma.monthlySummary.update({
      where: { id: summary.id },
      data: {
        expenses: totalExpenses,
        savings: currentSavings,
        goalStatus: isGoalMet ? 'ACHIEVED' : (summary.goalStatus === 'ACHIEVED' ? 'IN_PROGRESS' : summary.goalStatus),
      },
    });

    if (!isGoalMet && summary.goalStatus === 'IN_PROGRESS') {
      const gracePeriodEnd = new Date(monthEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
      await prisma.monthlySummary.update({
        where: { id: summary.id },
        data: { goalStatus: 'GRACE_PERIOD', gracePeriodEnd },
      });
    }
  }
}

async function checkAchievements(userId, currentMonthSavings, newStreak) {
  const totalSavedResult = await prisma.monthlySummary.aggregate({
    where: { userId },
    _sum: { savings: true },
  });
  const totalSaved = Number(totalSavedResult._sum.savings || 0);

  const existingAchievements = await prisma.achievement.findMany({
    where: { userId },
    select: { badgeName: true },
  });
  const earnedBadges = new Set(existingAchievements.map(a => a.badgeName));

  const newAchievements = [];

  if (!earnedBadges.has('FIRST_GOAL_COMPLETED')) {
    newAchievements.push({ userId, badgeName: 'FIRST_GOAL_COMPLETED' });
  }
  if (totalSaved >= 5000 && !earnedBadges.has('SAVED_5000')) {
    newAchievements.push({ userId, badgeName: 'SAVED_5000' });
  }
  if (totalSaved >= 10000 && !earnedBadges.has('SAVED_10000')) {
    newAchievements.push({ userId, badgeName: 'SAVED_10000' });
  }
  if (newStreak >= 3 && !earnedBadges.has('STREAK_3_MONTHS')) {
    newAchievements.push({ userId, badgeName: 'STREAK_3_MONTHS' });
  }
  if (newStreak >= 6 && !earnedBadges.has('STREAK_6_MONTHS')) {
    newAchievements.push({ userId, badgeName: 'STREAK_6_MONTHS' });
  }

  if (newAchievements.length > 0) {
    await prisma.achievement.createMany({ data: newAchievements, skipDuplicates: true });

    for (const ach of newAchievements) {
      await prisma.notification.create({
        data: {
          userId,
          title: 'New Achievement!',
          message: `You earned: ${ach.badgeName.replace(/_/g, ' ')}`,
          type: 'ACHIEVEMENT_EARNED',
        },
      });
    }
  }
}
