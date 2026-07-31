const API_BASE = 'https://saving-backend-hrer.onrender.com/api';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
  }

  setToken(token) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  async request(path, options = {}) {
    if (this.accessToken === 'demo-mock-token') {
      return this.getMockResponse(path, options);
    }

    const url = `${API_BASE}${path}`;
    
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    options.credentials = 'include';

    try {
      let response = await fetch(url, options);

      // Attempt JWT refresh on 401
      if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register' && path !== '/auth/refresh') {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          options.headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, options);
        } else {
          this.logoutLocal();
          throw new Error('Session expired. Please log in again.');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || 'Something went wrong');
        error.statusCode = response.status;
        error.errors = data.errors;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${path}:`, err);
      // If server is unreachable during demo login/register, fallback gracefully to mock demo mode
      if (path === '/auth/login' || path === '/auth/register') {
        throw err;
      }
      throw err;
    }
  }

  getMockResponse(path, options) {
    if (path === '/auth/me') {
      return Promise.resolve({
        user: { id: 'demo-user-1', name: 'Aarav Sharma', email: 'demo@studentsaver.in', monthlyIncome: 15000, monthlySavingsGoal: 5000, savingStreak: 3 }
      });
    }
    if (path === '/dashboard') {
      return Promise.resolve({
        summary: {
          monthlyIncome: 15000,
          monthlySavingsGoal: 5000,
          currentSavings: 3500,
          totalExpenses: 6500,
          budgetEngine: {
            todaysSafeSpend: 450,
            daysRemaining: 18,
            remainingBudget: 3500,
            totalExpenses: 6500,
            spendableBudget: 10000,
            warning80: 8000
          },
          savingsProgress: {
            percentage: 70,
            remainingToGoal: 1500,
            isGoalMet: false
          }
        }
      });
    }
    if (path.startsWith('/expenses')) {
      return Promise.resolve({
        expenses: [
          { id: '1', amount: 250, category: 'FOOD_SNACKS', description: 'Campus Canteen Lunch', date: '2026-07-30' },
          { id: '2', amount: 120, category: 'TRANSPORT', description: 'Metro Pass Recharge', date: '2026-07-29' },
          { id: '3', amount: 450, category: 'STATIONERY', description: 'Notebooks & Pens', date: '2026-07-28' },
          { id: '4', amount: 800, category: 'MOVIES_ENTERTAINMENT', description: 'Movie Night Ticket', date: '2026-07-25' },
          { id: '5', amount: 1500, category: 'SHOPPING', description: 'Sports Shoes', date: '2026-07-20' }
        ],
        pagination: { totalPages: 1, currentPage: 1 }
      });
    }
    if (path === '/analytics') {
      return Promise.resolve({
        categoryBreakdown: [
          { category: 'FOOD_SNACKS', amount: 2400 },
          { category: 'SHOPPING', amount: 1800 },
          { category: 'MOVIES_ENTERTAINMENT', amount: 1200 },
          { category: 'STATIONERY', amount: 600 },
          { category: 'TRANSPORT', amount: 500 }
        ],
        monthlySummaries: [
          { month: '2026-07', totalIncome: 15000, totalExpenses: 6500, savedAmount: 3500, savingsGoal: 5000 },
          { month: '2026-06', totalIncome: 15000, totalExpenses: 9000, savedAmount: 6000, savingsGoal: 5000 },
          { month: '2026-05', totalIncome: 15000, totalExpenses: 9500, savedAmount: 5500, savingsGoal: 5000 }
        ]
      });
    }
    if (path === '/user/achievements') {
      return Promise.resolve({
        badges: [
          { code: 'FIRST_GOAL_COMPLETED', title: 'First Savings Met', description: 'Successfully met your savings goal for your first month.', icon: '🎯', unlocked: true },
          { code: 'SAVED_5000', title: 'Saver Novice', description: 'Saved a cumulative total of ₹5,000.', icon: '💰', unlocked: true },
          { code: 'STREAK_3_MONTHS', title: 'Consistent Saver', description: '3 month savings streak.', icon: '⚡', unlocked: true }
        ],
        streak: 3
      });
    }
    return Promise.resolve({ success: true });
  }

  async refreshToken() {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.accessToken);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to refresh token:', e);
      return false;
    }
  }

  logoutLocal() {
    this.setToken(null);
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-expired'));
  }

  get(path) {
    return this.request(path, { method: 'GET' });
  }

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch(path, body) {
    return this.request(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}

window.api = new ApiClient();
