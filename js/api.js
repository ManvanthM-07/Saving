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
      throw err;
    }
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
