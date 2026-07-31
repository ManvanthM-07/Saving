// StudentSaver Core Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const toastContainer = document.getElementById('toast-container');
  const loadingOverlay = document.getElementById('loading-overlay');
  
  // Screens
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  
  // Auth Form Toggle
  const goToRegister = document.getElementById('go-to-register');
  const goToLogin = document.getElementById('go-to-login');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authSubtitle = document.getElementById('auth-subtitle');
  
  // Forms & Modal
  const profileForm = document.getElementById('profile-form');
  const expenseModal = document.getElementById('expense-modal');
  const expenseForm = document.getElementById('expense-form');
  const expenseIdInput = document.getElementById('expense-id');
  const expenseAmountInput = document.getElementById('expense-amount');
  const expenseCategorySelect = document.getElementById('expense-category');
  const expenseDescriptionInput = document.getElementById('expense-description');
  const expenseDateInput = document.getElementById('expense-date');

  // Exceeded Target Options Modal & Banner Elements
  const exceededModal = document.getElementById('exceeded-target-modal');
  const closeExceededModalBtn = document.getElementById('close-exceeded-modal-btn');
  const cancelExceededBtn = document.getElementById('cancel-exceeded-btn');
  const exceededOptionsForm = document.getElementById('exceeded-options-form');
  const optionCardWeek = document.getElementById('option-card-week');
  const optionCardNextMonth = document.getElementById('option-card-nextmonth');
  const btnManageExceededPlan = document.getElementById('btn-manage-exceeded-plan');
  const btnSettleLoss = document.getElementById('btn-settle-loss');
  const exceededRecoveryBanner = document.getElementById('exceeded-recovery-banner');
  
  // Buttons
  const logoutBtn = document.getElementById('logout-btn');
  const quickAddBtn = document.getElementById('quick-add-btn');
  const closeExpenseModalBtn = document.getElementById('close-expense-modal-btn');
  const cancelExpenseBtn = document.getElementById('cancel-expense-btn');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const viewAllExpenses = document.getElementById('view-all-expenses');
  
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const pageTitle = document.getElementById('page-title');
  
  // State
  let currentUser = null;
  let activeSection = 'dashboard-section';
  let currentExpensePage = 1;
  const expenseLimit = 10;

  // --- Notifications & Toast Activity System ---
  let notificationLog = [];

  function addNotificationToLog(message, type, icon) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    notificationLog.unshift({ id: Date.now(), message, type, icon, time: timeStr });
    if (notificationLog.length > 25) notificationLog.pop();
    renderNotificationLog();
  }

  function renderNotificationLog() {
    const listDash = document.getElementById('notification-list');
    const listFull = document.getElementById('notification-list-full');
    const countDash = document.getElementById('notif-count');
    const countFull = document.getElementById('notif-count-full');

    if (countDash) countDash.textContent = notificationLog.length;
    if (countFull) countFull.textContent = notificationLog.length;

    if (!notificationLog.length) {
      const emptyHTML = `<div class="empty-state">No notifications recorded yet. You are on track!</div>`;
      if (listDash) listDash.innerHTML = emptyHTML;
      if (listFull) listFull.innerHTML = emptyHTML;
      return;
    }

    const itemsHTML = notificationLog.map(n => `
      <div class="notif-item">
        <div class="notif-icon">${n.icon}</div>
        <div class="notif-content">
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>
    `).join('');

    if (listDash) listDash.innerHTML = itemsHTML;
    if (listFull) listFull.innerHTML = itemsHTML;
  }

  function showToast(message, type = 'info') {
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    // Log to Dashboard Notification Panel
    addNotificationToLog(message, type, icon);

    // Keep max 2 floating banner toasts to prevent cluttering
    if (toastContainer && toastContainer.children.length >= 2) {
      const oldest = toastContainer.children[0];
      oldest.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div> <button type="button" class="toast-close" title="Dismiss">✕</button>`;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-dismissing');
      setTimeout(() => toast.remove(), 250);
    };

    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    if (toastContainer) toastContainer.appendChild(toast);
    setTimeout(dismiss, 2800);
  }

  // Clear Notifications Listener
  const clearBtnDash = document.getElementById('clear-notifications-btn');
  const clearBtnFull = document.getElementById('clear-notifications-full-btn');
  const clearNotifs = () => {
    notificationLog = [];
    renderNotificationLog();
  };
  if (clearBtnDash) clearBtnDash.addEventListener('click', clearNotifs);
  if (clearBtnFull) clearBtnFull.addEventListener('click', clearNotifs);

  // --- Loader ---
  function showLoader(show) {
    if (show) {
      loadingOverlay.classList.remove('hidden');
    } else {
      loadingOverlay.classList.add('hidden');
    }
  }

  // --- Authentication Handling ---
  function checkAuth() {
    const token = window.api.accessToken;
    if (token) {
      fetchUserProfile();
    } else {
      showAuthScreen();
    }
  }

  async function fetchUserProfile() {
    showLoader(true);
    try {
      const data = await window.api.get('/auth/me');
      currentUser = data.user;
      showAppScreen();
    } catch (err) {
      showToast('Please log in to continue.', 'error');
      showAuthScreen();
    } finally {
      showLoader(false);
    }
  }

  function showAuthScreen() {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }

  function showAppScreen() {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    
    // Update user display details
    document.getElementById('nav-username').textContent = currentUser.name;
    document.getElementById('nav-streak').textContent = `🔥 ${currentUser.savingStreak ?? 0} month streak`;
    document.getElementById('nav-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Default form values for profile settings
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-income').value = currentUser.monthlyIncome;
    document.getElementById('profile-savings-goal').value = currentUser.monthlySavingsGoal;
    
    // Switch to default dashboard section
    switchSection('dashboard-section');
  }

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
      const data = await window.api.post('/auth/login', { email, password });
      window.api.setToken(data.accessToken);
      currentUser = data.user;
      showToast('Logged in successfully', 'success');
      showAppScreen();
      loginForm.reset();
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      showLoader(false);
    }
  });

  // Register handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
      const data = await window.api.post('/auth/register', { name, email, password });
      window.api.setToken(data.accessToken);
      currentUser = data.user;
      showToast('Account created successfully!', 'success');
      showAppScreen();
      registerForm.reset();
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      showLoader(false);
    }
  });

  // Logout handler
  logoutBtn.addEventListener('click', async () => {
    showLoader(true);
    try {
      await window.api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      window.api.logoutLocal();
      showLoader(false);
    }
  });

  // Toggle Forms & Tab Controls
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authMainTitle = document.getElementById('auth-main-title');

  function activateLoginTab() {
    if (tabLogin && tabRegister) {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
    }
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    if (authMainTitle) authMainTitle.textContent = 'Welcome Back';
    if (authSubtitle) authSubtitle.textContent = 'Save smart, spend safe, and build habits.';
  }

  function activateRegisterTab() {
    if (tabLogin && tabRegister) {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
    }
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    if (authMainTitle) authMainTitle.textContent = 'Create Account';
    if (authSubtitle) authSubtitle.textContent = 'Join 14,200+ students building financial freedom.';
  }

  if (tabLogin) tabLogin.addEventListener('click', activateLoginTab);
  if (tabRegister) tabRegister.addEventListener('click', activateRegisterTab);
  if (goToRegister) goToRegister.addEventListener('click', (e) => { e.preventDefault(); activateRegisterTab(); });
  if (goToLogin) goToLogin.addEventListener('click', (e) => { e.preventDefault(); activateLoginTab(); });

  // Password Show/Hide Visibility Toggle
  function setupPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (btn && input) {
      btn.addEventListener('click', () => {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        const eyeOpen = btn.querySelector('.eye-open');
        const eyeClosed = btn.querySelector('.eye-closed');
        if (eyeOpen && eyeClosed) {
          eyeOpen.classList.toggle('hidden', isPass);
          eyeClosed.classList.toggle('hidden', !isPass);
        }
      });
    }
  }
  setupPasswordToggle('toggle-login-pass', 'login-password');
  setupPasswordToggle('toggle-reg-pass', 'register-password');

  // Interactive Cursor Light Spotlight
  const cursorGlow = document.getElementById('cursor-glow');
  if (authScreen && cursorGlow) {
    authScreen.addEventListener('mousemove', (e) => {
      const rect = authScreen.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cursorGlow.style.left = `${x}px`;
      cursorGlow.style.top = `${y}px`;
    });
  }

  // Instant Demo Login Action
  async function handleDemoLogin() {
    showLoader(true);
    const demoEmail = 'demo@studentsaver.in';
    const demoPassword = 'Password123!';
    const demoName = 'Aarav Sharma';

    try {
      const data = await window.api.post('/auth/login', { email: demoEmail, password: demoPassword });
      window.api.setToken(data.accessToken);
      currentUser = data.user;
      showToast('⚡ Logged in with Demo Account!', 'success');
      showAppScreen();
    } catch (err) {
      try {
        const regData = await window.api.post('/auth/register', { name: demoName, email: demoEmail, password: demoPassword });
        window.api.setToken(regData.accessToken);
        currentUser = regData.user;
        showToast('⚡ Demo Account created & logged in!', 'success');
        showAppScreen();
      } catch (regErr) {
        // Fallback for offline demo mode
        window.api.setToken('demo-mock-token');
        currentUser = {
          id: 'demo-user-1',
          name: demoName,
          email: demoEmail,
          monthlyIncome: 15000,
          monthlySavingsGoal: 5000,
          savingStreak: 3
        };
        showToast('⚡ Logged in with Demo Mode!', 'success');
        showAppScreen();
      }
    } finally {
      showLoader(false);
    }
  }

  const demoBtns = [
    document.getElementById('btn-demo-login'),
    document.getElementById('btn-demo-register')
  ];

  demoBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', handleDemoLogin);
  });

  window.addEventListener('auth-expired', () => {
    currentUser = null;
    showAuthScreen();
  });

  // --- SPA Navigation Router ---
  function switchSection(sectionId) {
    activeSection = sectionId;
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.add('hidden');
    });
    
    // Show active section
    document.getElementById(sectionId).classList.remove('hidden');
    
    // Highlight sidebar items
    navItems.forEach(item => {
      if (item.getAttribute('data-target') === sectionId) {
        item.classList.add('active');
        pageTitle.textContent = item.querySelector('span').textContent;
      } else {
        item.classList.remove('active');
      }
    });

    // Populate data based on current section
    if (sectionId === 'dashboard-section') {
      loadDashboardData();
    } else if (sectionId === 'expenses-section') {
      currentExpensePage = 1;
      loadExpensesData();
    } else if (sectionId === 'analytics-section') {
      loadAnalyticsData();
    } else if (sectionId === 'achievements-section') {
      loadAchievementsData();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-target');
      switchSection(target);
    });
  });

  viewAllExpenses.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection('expenses-section');
  });

  // --- Load Dashboard Data ---
  async function loadDashboardData() {
    try {
      const data = await window.api.get('/dashboard');
      const summary = data.summary;
      
      // Update Stats
      document.getElementById('income-val').textContent = formatCurrency(summary.monthlyIncome);
      document.getElementById('target-val').textContent = formatCurrency(summary.monthlySavingsGoal);
      document.getElementById('current-savings-val').textContent = formatCurrency(summary.currentSavings);
      document.getElementById('total-expenses-val').textContent = formatCurrency(summary.totalExpenses);
      
      // Update Daily Safe Spend Info
      const budgetEngine = summary.budgetEngine;
      const safeSpendVal = document.getElementById('safe-spend-val');
      const safeSpendBadge = document.getElementById('budget-track-status');
      
      safeSpendVal.textContent = budgetEngine.todaysSafeSpend.toFixed(2);
      document.getElementById('days-remaining-val').textContent = `${budgetEngine.daysRemaining} days`;
      document.getElementById('remaining-budget-val').textContent = formatCurrency(budgetEngine.remainingBudget);

      // Status Badge Styling & Exceeded Recovery Handling
      safeSpendBadge.className = 'status-badge';
      if (budgetEngine.totalExpenses <= budgetEngine.warning80) {
        safeSpendBadge.textContent = 'ON TRACK';
        safeSpendBadge.classList.add('success');
      } else if (budgetEngine.totalExpenses < budgetEngine.spendableBudget) {
        safeSpendBadge.textContent = 'WARNING 80%';
        safeSpendBadge.classList.add('warning');
      } else {
        safeSpendBadge.textContent = 'EXCEEDED';
        safeSpendBadge.classList.add('danger');
      }

      // Handle Exceeded Target Recovery (Prompt & Options)
      handleExceededTargetLogic(summary);

      // Update Savings Progress
      const savingsProgress = summary.savingsProgress;
      const progressBar = document.getElementById('savings-progress-bar');
      const progressPercent = document.getElementById('progress-percentage');
      const progressDesc = document.getElementById('progress-desc');
      
      progressBar.style.width = `${savingsProgress.percentage}%`;
      progressPercent.textContent = `${Math.round(savingsProgress.percentage)}%`;
      
      if (savingsProgress.isGoalMet && summary.monthlySavingsGoal > 0) {
        progressDesc.textContent = 'Excellent! You have achieved your savings goal for this month!';
        progressDesc.style.color = 'var(--success)';
      } else if (summary.monthlySavingsGoal === 0) {
        progressDesc.textContent = 'Set a savings target in Profile & Budget to track your progress.';
        progressDesc.style.color = 'var(--text-muted)';
      } else {
        progressDesc.textContent = `You need to save ${formatCurrency(savingsProgress.remainingToGoal)} more to meet your target.`;
        progressDesc.style.color = 'var(--text-muted)';
      }

      // Recent Transactions & Spending Breakdown
      renderRecentTransactions(summary.recentTransactions);
      renderDashCategoryBreakdown(summary.categoryBreakdown);

      // Notifications
      renderNotifications(data.notifications);

      // Streaks
      document.getElementById('nav-streak').textContent = `🔥 ${currentUser.savingStreak ?? 0} month streak`;

    } catch (err) {
      showToast('Error loading dashboard data', 'error');
    }
  }

  function renderDashCategoryBreakdown(categories) {
    const list = document.getElementById('dash-category-bars-list');
    if (!list) return;
    list.innerHTML = '';

    if (!categories || categories.length === 0 || categories.every(c => c.amount === 0)) {
      list.innerHTML = '<div class="empty-state">No expense breakdown yet. Add your first expense!</div>';
      return;
    }

    const sorted = [...categories].sort((a, b) => b.amount - a.amount);
    sorted.forEach(c => {
      if (c.amount > 0) {
        const item = document.createElement('div');
        item.className = 'chart-bar-item';
        item.innerHTML = `
          <div class="chart-bar-meta">
            <span class="chart-bar-label">${formatCategoryName(c.category)}</span>
            <span class="chart-bar-value">₹${c.amount.toFixed(2)} (${Math.round(c.percentage)}%)</span>
          </div>
          <div class="chart-bar-bg">
            <div class="chart-bar-fill tag-${c.category}" style="width: ${c.percentage}%"></div>
          </div>
        `;
        list.appendChild(item);
      }
    });
  }

  const viewAnalyticsFromDash = document.getElementById('view-analytics-from-dash');
  if (viewAnalyticsFromDash) {
    viewAnalyticsFromDash.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('analytics-section');
    });
  }

  // --- Exceeded Target Management Logic & Event Handlers ---
  let currentExceededDeficit = 0;

  function handleExceededTargetLogic(summary) {
    const budgetEngine = summary.budgetEngine;
    const spendableBudget = budgetEngine.spendableBudget;
    const totalExpenses = budgetEngine.totalExpenses;
    const deficit = totalExpenses - spendableBudget;
    const safeSpendBadge = document.getElementById('budget-track-status');
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (deficit > 0 && summary.monthlySavingsGoal > 0) {
      currentExceededDeficit = deficit;
      const lossAmount = deficit;
      
      // Update modal copy with real loss values
      const modalLossEl = document.getElementById('exceeded-modal-loss-amount');
      const optWeekLoss = document.getElementById('opt-week-loss');
      const optNextCurrent = document.getElementById('opt-nextmonth-current');
      const optNextNew = document.getElementById('opt-nextmonth-new');
      const settleAmtVal = document.getElementById('settle-amt-val');

      if (modalLossEl) modalLossEl.textContent = formatCurrency(lossAmount);
      if (optWeekLoss) optWeekLoss.textContent = formatCurrency(lossAmount);
      if (optNextCurrent) optNextCurrent.textContent = formatCurrency(summary.monthlySavingsGoal);
      if (optNextNew) optNextNew.textContent = formatCurrency(summary.monthlySavingsGoal + lossAmount);
      if (settleAmtVal) settleAmtVal.textContent = lossAmount.toFixed(2);

      // Check stored user resolution
      let userResolution = localStorage.getItem(`exceeded_resolution_${monthKey}`) || summary.goalStatus;

      if (userResolution === 'PAY_WITHIN_WEEK' || userResolution === 'GRACE_PERIOD') {
        safeSpendBadge.textContent = 'GRACE PERIOD (7 DAYS)';
        safeSpendBadge.className = 'status-badge warning';
        
        if (exceededRecoveryBanner) exceededRecoveryBanner.classList.remove('hidden');
        document.getElementById('exceeded-banner-emoji').textContent = '⏳';
        document.getElementById('exceeded-banner-title').textContent = 'Pay Within 1 Week — Grace Period Active';
        document.getElementById('exceeded-banner-desc').textContent = `You have 7 days to cover the remaining loss of ${formatCurrency(lossAmount)}. Settle it within a week to protect your goal & streak!`;
        if (btnSettleLoss) btnSettleLoss.classList.remove('hidden');
      } else if (userResolution === 'ADD_TO_NEXT_MONTH' || userResolution === 'ROLLED_OVER') {
        safeSpendBadge.textContent = 'DEFICIT ROLLED OVER';
        safeSpendBadge.className = 'status-badge warning';

        if (exceededRecoveryBanner) exceededRecoveryBanner.classList.remove('hidden');
        document.getElementById('exceeded-banner-emoji').textContent = '📈';
        document.getElementById('exceeded-banner-title').textContent = 'Loss Added to Next Month Target';
        document.getElementById('exceeded-banner-desc').textContent = `Remaining loss of ${formatCurrency(lossAmount)} will be added to next month's savings target (New Next Month Target: ${formatCurrency(summary.monthlySavingsGoal + lossAmount)}).`;
        if (btnSettleLoss) btnSettleLoss.classList.add('hidden');
      } else {
        // Unresolved Exceeded
        safeSpendBadge.textContent = 'EXCEEDED';
        safeSpendBadge.className = 'status-badge danger';

        if (exceededRecoveryBanner) exceededRecoveryBanner.classList.remove('hidden');
        document.getElementById('exceeded-banner-emoji').textContent = '⚠️';
        document.getElementById('exceeded-banner-title').textContent = 'Savings Target Exceeded!';
        document.getElementById('exceeded-banner-desc').textContent = `Remaining loss of ${formatCurrency(lossAmount)} encroaches on your target. Choose your recovery plan now.`;
        if (btnSettleLoss) btnSettleLoss.classList.add('hidden');

        // Automatically trigger modal if not already opened/prompted for this deficit amount
        const modalShownKey = `exceeded_modal_shown_${monthKey}_${Math.round(lossAmount)}`;
        if (!localStorage.getItem(modalShownKey)) {
          openExceededModal();
          localStorage.setItem(modalShownKey, 'true');
        }
      }
    } else {
      currentExceededDeficit = 0;
      if (exceededRecoveryBanner) exceededRecoveryBanner.classList.add('hidden');
      if (btnSettleLoss) btnSettleLoss.classList.add('hidden');
    }
  }

  function openExceededModal() {
    if (exceededModal) exceededModal.classList.remove('hidden');
  }

  function closeExceededModal() {
    if (exceededModal) exceededModal.classList.add('hidden');
  }

  // Option radio selection toggle
  const optionRadios = document.querySelectorAll('input[name="exceeded_action"]');
  const optionCards = document.querySelectorAll('.exceeded-option-card');

  optionCards.forEach(card => {
    card.addEventListener('click', (e) => {
      const radio = card.querySelector('input[name="exceeded_action"]');
      if (radio) {
        radio.checked = true;
        optionCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      }
    });
  });

  if (closeExceededModalBtn) closeExceededModalBtn.addEventListener('click', closeExceededModal);
  if (cancelExceededBtn) cancelExceededBtn.addEventListener('click', closeExceededModal);
  if (btnManageExceededPlan) btnManageExceededPlan.addEventListener('click', openExceededModal);

  function renderNotifications(notifications) {
    if (Array.isArray(notifications) && notifications.length > 0) {
      notifications.forEach(n => {
        const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
        const msg = `${n.title ? n.title + ': ' : ''}${n.message}`;
        const exists = notificationLog.some(existing => existing.message === msg);
        if (!exists) {
          notificationLog.push({ id: n.id || Date.now(), message: msg, type: 'info', icon: '🔔', time: timeStr });
        }
      });
    }
    renderNotificationLog();
  }

  if (exceededOptionsForm) {
    exceededOptionsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoader(true);

      const selectedOption = document.querySelector('input[name="exceeded_action"]:checked')?.value || 'PAY_WITHIN_WEEK';
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      try {
        try {
          await window.api.post('/monthlySummary/resolve-exceeded', { resolution: selectedOption, month: monthKey });
        } catch (apiErr) {
          // graceful fallback for demo mode
        }

        localStorage.setItem(`exceeded_resolution_${monthKey}`, selectedOption);

        if (selectedOption === 'PAY_WITHIN_WEEK') {
          showToast('7-day grace period activated! Pay within a week to protect your streak.', 'success');
          addNotificationToLog(`Activated 7-day grace period for loss of ${formatCurrency(currentExceededDeficit)}`, 'warning', '⏳');
        } else {
          showToast('Deficit will be added to next month\'s savings target!', 'success');
          addNotificationToLog(`Loss of ${formatCurrency(currentExceededDeficit)} added to next month target`, 'info', '📈');
        }

        closeExceededModal();
        loadDashboardData();
      } catch (err) {
        showToast('Failed to update option', 'error');
      } finally {
        showLoader(false);
      }
    });
  }

  if (btnSettleLoss) {
    btnSettleLoss.addEventListener('click', async () => {
      if (confirm(`Do you want to settle/pay back the loss of ${formatCurrency(currentExceededDeficit)} now?`)) {
        showLoader(true);
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        try {
          try {
            await window.api.post('/monthlySummary/settle-loss', { month: monthKey });
          } catch (e) {}

          localStorage.removeItem(`exceeded_resolution_${monthKey}`);
          localStorage.removeItem(`exceeded_modal_shown_${monthKey}_${Math.round(currentExceededDeficit)}`);

          showToast('Deficit settled successfully! Savings target restored.', 'success');
          addNotificationToLog(`Settled deficit of ${formatCurrency(currentExceededDeficit)}!`, 'success', '✨');

          loadDashboardData();
        } catch (err) {
          showToast('Error settling loss', 'error');
        } finally {
          showLoader(false);
        }
      }
    });
  }

  function renderRecentTransactions(transactions) {
    const list = document.getElementById('recent-expenses-list');
    list.innerHTML = '';
    
    if (transactions.length === 0) {
      list.innerHTML = '<div class="empty-state">No transactions yet. Add your first expense!</div>';
      return;
    }

    transactions.forEach(t => {
      const item = document.createElement('div');
      item.className = 'transaction-item';
      item.innerHTML = `
        <div class="transaction-meta">
          <div class="category-tag tag-${t.category}"></div>
          <div class="transaction-details">
            <span class="transaction-desc">${t.description || formatCategoryName(t.category)}</span>
            <span class="transaction-cat">${formatCategoryName(t.category)}</span>
            <span class="transaction-date">${t.date}</span>
          </div>
        </div>
        <div class="transaction-amt text-danger">-₹${t.amount.toFixed(2)}</div>
      `;
      list.appendChild(item);
    });
  }

  function renderNotifications(notifications) {
    const list = document.getElementById('notification-list');
    list.innerHTML = '';

    if (notifications.length === 0) {
      list.innerHTML = '<div class="empty-state">No notifications. You are on track!</div>';
      return;
    }

    notifications.forEach(n => {
      const item = document.createElement('div');
      item.className = 'notification-item';
      const timeStr = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      item.innerHTML = `
        <h5>${n.title}</h5>
        <p>${n.message}</p>
        <span class="notification-time">${timeStr}</span>
      `;
      list.appendChild(item);
    });
  }

  // --- Expenses Page ---
  const filterCategory = document.getElementById('expense-filter-category');
  const filterMonth = document.getElementById('expense-filter-month');
  
  async function loadExpensesData() {
    showLoader(true);
    try {
      const category = filterCategory.value;
      const month = filterMonth.value;
      
      let query = `?page=${currentExpensePage}&limit=${expenseLimit}`;
      if (category) query += `&category=${category}`;
      if (month) query += `&month=${month}`;

      const res = await window.api.get(`/expenses${query}`);
      renderExpensesTable(res.data);
      renderPagination(res.meta);
    } catch (err) {
      showToast('Error loading expenses list', 'error');
    } finally {
      showLoader(false);
    }
  }

  function renderExpensesTable(expenses) {
    const tbody = document.getElementById('expenses-table-body');
    tbody.innerHTML = '';

    if (expenses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No expenses matching criteria.</td></tr>';
      return;
    }

    expenses.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.date}</td>
        <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid var(--panel-border); font-size:10px;">${formatCategoryName(e.category)}</span></td>
        <td>${e.description || '-'}</td>
        <td class="font-weight-bold text-danger">-₹${e.amount.toFixed(2)}</td>
        <td class="text-right">
          <button class="action-btn edit-btn" data-id="${e.id}">✏️</button>
          <button class="action-btn delete delete-btn" data-id="${e.id}">🗑️</button>
        </td>
      `;
      
      // Wire events
      tr.querySelector('.edit-btn').addEventListener('click', () => openExpenseForm(e.id));
      tr.querySelector('.delete-btn').addEventListener('click', () => deleteExpense(e.id));

      tbody.appendChild(tr);
    });
  }

  function renderPagination(meta) {
    const pag = document.getElementById('expenses-pagination');
    pag.innerHTML = '';

    if (meta.totalPages <= 1) return;

    // Previous Button
    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.textContent = '←';
    prev.disabled = meta.page === 1;
    prev.addEventListener('click', () => {
      currentExpensePage--;
      loadExpensesData();
    });
    pag.appendChild(prev);

    // Page Numbers
    for (let i = 1; i <= meta.totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-btn ${meta.page === i ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentExpensePage = i;
        loadExpensesData();
      });
      pag.appendChild(pageBtn);
    }

    // Next Button
    const next = document.createElement('button');
    next.className = 'page-btn';
    next.textContent = '→';
    next.disabled = meta.page === meta.totalPages;
    next.addEventListener('click', () => {
      currentExpensePage++;
      loadExpensesData();
    });
    pag.appendChild(next);
  }

  filterCategory.addEventListener('change', () => {
    currentExpensePage = 1;
    loadExpensesData();
  });

  filterMonth.addEventListener('change', () => {
    currentExpensePage = 1;
    loadExpensesData();
  });

  resetFiltersBtn.addEventListener('click', () => {
    filterCategory.value = '';
    filterMonth.value = '';
    currentExpensePage = 1;
    loadExpensesData();
  });

  async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
      showLoader(true);
      try {
        await window.api.delete(`/expenses/${id}`);
        showToast('Expense deleted successfully', 'success');
        loadExpensesData();
      } catch (err) {
        showToast('Failed to delete expense', 'error');
      } finally {
        showLoader(false);
      }
    }
  }

  // --- Expense Form Modal ---
  function openExpenseForm(id = null) {
    expenseForm.reset();
    expenseDateInput.value = new Date().toISOString().split('T')[0];

    if (id) {
      expenseIdInput.value = id;
      document.getElementById('expense-modal-title').textContent = 'Edit Expense';
      fetchExpenseDetails(id);
    } else {
      expenseIdInput.value = '';
      document.getElementById('expense-modal-title').textContent = 'Add Expense';
      expenseModal.classList.remove('hidden');
    }
  }

  async function fetchExpenseDetails(id) {
    showLoader(true);
    try {
      const data = await window.api.get(`/expenses/${id}`);
      expenseAmountInput.value = data.amount;
      expenseCategorySelect.value = data.category;
      expenseDescriptionInput.value = data.description || '';
      expenseDateInput.value = data.date;
      expenseModal.classList.remove('hidden');
    } catch (e) {
      showToast('Error loading expense details', 'error');
    } finally {
      showLoader(false);
    }
  }

  function closeExpenseForm() {
    expenseModal.classList.add('hidden');
    expenseForm.reset();
  }

  quickAddBtn.addEventListener('click', () => openExpenseForm());
  closeExpenseModalBtn.addEventListener('click', closeExpenseForm);
  cancelExpenseBtn.addEventListener('click', closeExpenseForm);

  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    
    const id = expenseIdInput.value;
    const amount = parseFloat(expenseAmountInput.value);
    const category = expenseCategorySelect.value;
    const description = expenseDescriptionInput.value;
    const date = expenseDateInput.value;

    const payload = { amount, category, description, date };

    try {
      if (id) {
        await window.api.patch(`/expenses/${id}`, payload);
        showToast('Expense updated successfully!', 'success');
      } else {
        await window.api.post('/expenses', payload);
        showToast('Expense added successfully!', 'success');
      }
      closeExpenseForm();
      
      // Refresh current active view
      if (activeSection === 'dashboard-section') {
        loadDashboardData();
      } else if (activeSection === 'expenses-section') {
        loadExpensesData();
      } else if (activeSection === 'analytics-section') {
        loadAnalyticsData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save expense', 'error');
    } finally {
      showLoader(false);
    }
  });

  // --- Load Analytics ---
  async function loadAnalyticsData() {
    try {
      const data = await window.api.get('/analytics');
      
      // Render Category Bars
      const barsList = document.getElementById('category-bars-list');
      barsList.innerHTML = '';
      
      if (data.categories.length === 0 || data.categories.every(c => c.amount === 0)) {
        barsList.innerHTML = '<div class="empty-state">No expense data to analyze yet.</div>';
      } else {
        // Sort categories by highest spend
        const sorted = data.categories.sort((a,b) => b.amount - a.amount);
        sorted.forEach(c => {
          if (c.amount > 0) {
            const barItem = document.createElement('div');
            barItem.className = 'chart-bar-item';
            barItem.innerHTML = `
              <div class="chart-bar-meta">
                <span class="chart-bar-label">${formatCategoryName(c.category)}</span>
                <span class="chart-bar-value">₹${c.amount.toFixed(2)} (${Math.round(c.percentage)}%)</span>
              </div>
              <div class="chart-bar-bg">
                <div class="chart-bar-fill tag-${c.category}" style="width: ${c.percentage}%"></div>
              </div>
            `;
            barsList.appendChild(barItem);
          }
        });
      }

      // Render Monthly Trends
      const trendList = document.getElementById('analytics-trend-list');
      trendList.innerHTML = '';

      if (data.history.length === 0) {
        trendList.innerHTML = '<div class="empty-state">No historical savings summaries available.</div>';
      } else {
        data.history.forEach(h => {
          const item = document.createElement('div');
          item.className = 'trend-item';
          
          let goalClass = 'text-muted';
          let statusText = 'In Progress';
          if (h.goalStatus === 'ACHIEVED' || h.goalStatus === 'COMPLETED_GRACE') {
            goalClass = 'success';
            statusText = 'Goal Met';
          } else if (h.goalStatus === 'MISSED') {
            goalClass = 'danger';
            statusText = 'Missed';
          }
          
          const monthDate = new Date(h.month + 'T00:00:00');
          const monthFormatted = monthDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

          item.innerHTML = `
            <div class="trend-month-info">
              <span class="trend-month-name">${monthFormatted}</span>
              <span class="trend-month-status badge ${goalClass}" style="font-size: 10px; width: fit-content;">${statusText}</span>
            </div>
            <div class="trend-stats">
              <span class="trend-saved">₹${h.savings.toFixed(2)}</span>
              <div class="trend-target">Target: ₹${h.savingsTarget.toFixed(2)}</div>
            </div>
          `;
          trendList.appendChild(item);
        });
      }

    } catch (err) {
      showToast('Error loading analytics', 'error');
    }
  }

  // --- Load Achievements ---
  async function loadAchievementsData() {
    try {
      const data = await window.api.get('/dashboard');
      
      // Update streak display
      const streak = currentUser.savingStreak ?? 0;
      document.getElementById('achievement-streak-val').textContent = `${streak} Month${streak === 1 ? '' : 's'}`;
      
      // Lock all badges by default
      const badgeIds = ['FIRST_GOAL_COMPLETED', 'SAVED_5000', 'SAVED_10000', 'STREAK_3_MONTHS', 'STREAK_6_MONTHS'];
      badgeIds.forEach(id => {
        document.getElementById(`badge-${id}`).classList.add('locked');
      });

      // Unlock earned badges
      data.achievements.forEach(ach => {
        const badgeEl = document.getElementById(`badge-${ach.badgeName}`);
        if (badgeEl) {
          badgeEl.classList.remove('locked');
        }
      });
    } catch (err) {
      showToast('Error loading achievements', 'error');
    }
  }

  // --- Profile Settings Update ---
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const name = document.getElementById('profile-name').value;
    const monthlyIncome = parseFloat(document.getElementById('profile-income').value);
    const monthlySavingsGoal = parseFloat(document.getElementById('profile-savings-goal').value);

    if (monthlySavingsGoal > monthlyIncome) {
      showToast('Savings goal cannot exceed monthly income!', 'warning');
      showLoader(false);
      return;
    }

    try {
      const data = await window.api.patch('/user/profile', {
        name,
        monthlyIncome,
        monthlySavingsGoal,
      });

      currentUser = data.user;
      showToast('Budget settings updated successfully', 'success');
      
      // Update local storage representation
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      // Refresh user details across views
      document.getElementById('nav-username').textContent = currentUser.name;
      document.getElementById('nav-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

      switchSection('dashboard-section');
    } catch (err) {
      showToast('Failed to update settings', 'error');
    } finally {
      showLoader(false);
    }
  });

  // --- Helpers ---
  function formatCurrency(val) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(val));
  }

  function formatCategoryName(cat) {
    const names = {
      'FOOD_SNACKS': 'Food & Snacks',
      'TRANSPORT': 'Transport',
      'STATIONERY': 'Stationery',
      'MOVIES_ENTERTAINMENT': 'Movies & Entertainment',
      'SHOPPING': 'Shopping',
      'OTHER': 'Other',
    };
    return names[cat] || cat;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREMIUM GOLD RIPPLE & SPARKLE CLICK ANIMATION
  // ═══════════════════════════════════════════════════════════════════════════
  document.addEventListener('click', (e) => {
    // 1. Create expanding gold ripple ring
    const ripple = document.createElement('div');
    ripple.className = 'gold-click-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // 2. Spawn 5 drifting golden starburst embers
    const numEmbers = 5;
    for (let i = 0; i < numEmbers; i++) {
      const angle = (i * (2 * Math.PI / numEmbers)) + (Math.random() - 0.5) * 0.5;
      const distance = 25 + Math.random() * 25;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const ember = document.createElement('div');
      ember.className = 'gold-sparkle-ember';
      ember.style.left = `${e.clientX}px`;
      ember.style.top = `${e.clientY}px`;
      ember.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      ember.style.setProperty('--dy', `${dy.toFixed(1)}px`);

      document.body.appendChild(ember);
      setTimeout(() => ember.remove(), 550);
    }
  });

  // Initial Boot Checking
  checkAuth();
});

