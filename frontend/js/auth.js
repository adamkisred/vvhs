// Admin authentication helpers and page guards.
const resolveAuthApiBaseUrl = () => {
    const configuredUrl = window.VISWASHANTHI_API_BASE;

    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    const { protocol, hostname } = window.location;

    if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }

    return `${window.location.origin}/api`;
};

const AUTH_API_BASE = resolveAuthApiBaseUrl();
const AUTH_TOKEN_KEY = 'viswashanthi_admin_token';
const AUTH_USER_KEY = 'viswashanthi_admin_user';

const Auth = {
    getToken() {
        const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);

        if (sessionToken) {
            return sessionToken;
        }

        const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);

        if (legacyToken) {
            sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
            localStorage.removeItem(AUTH_TOKEN_KEY);
            return legacyToken;
        }

        return null;
    },

    getUser() {
        try {
            const sessionUser = sessionStorage.getItem(AUTH_USER_KEY);

            if (sessionUser) {
                return JSON.parse(sessionUser);
            }

            const legacyUser = localStorage.getItem(AUTH_USER_KEY);

            if (legacyUser) {
                sessionStorage.setItem(AUTH_USER_KEY, legacyUser);
                localStorage.removeItem(AUTH_USER_KEY);
                return JSON.parse(legacyUser);
            }

            return null;
        } catch (error) {
            return null;
        }
    },

    setSession(token, admin) {
        if (token) {
            sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        } else {
            sessionStorage.removeItem(AUTH_TOKEN_KEY);
        }

        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(admin));
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    },

    clearSession() {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    },

    removePendingGuard() {
        document.documentElement.classList.remove('admin-auth-pending');
    },

    async request(endpoint, options = {}) {
        const headers = options.headers || {};
        const token = this.getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${AUTH_API_BASE}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            this.clearSession();

            if (!window.location.pathname.endsWith('/login.html')) {
                window.location.href = 'login.html';
            }
        }

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    },

    async verifySession() {
        const result = await this.request('/auth/me');
        this.setSession(this.getToken(), result.admin);
        return result.admin;
    }
};

const fillAdminName = () => {
    const admin = Auth.getUser();
    document.querySelectorAll('[data-admin-name]').forEach((element) => {
        element.textContent = admin?.name || admin?.username || 'Administrator';
    });
};

const protectAdminPage = async () => {
    const body = document.body;

    if (body.dataset.requiresAuth !== 'true') {
        return true;
    }

    try {
        const admin = await Auth.verifySession();
        fillAdminName();
        return Boolean(admin);
    } catch (error) {
        Auth.clearSession();
        window.location.href = 'login.html';
        return false;
    }
};

const initLoginForm = () => {
    const form = document.getElementById('loginForm');

    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';

        try {
            const payload = {
                username: form.username.value.trim(),
                password: form.password.value
            };

            const result = await fetch(`${AUTH_API_BASE}/auth/login`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).then(async (response) => {
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                return data;
            });

            Auth.setSession(result.token, result.admin);
            window.location.href = 'dashboard.html';
        } catch (error) {
            const messageEl = document.getElementById('loginMessage');
            if (messageEl) {
                messageEl.textContent = error.message;
                messageEl.classList.remove('d-none');
            } else {
                alert(error.message);
            }
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });
};

const initLogout = () => {
    document.querySelectorAll('[data-logout]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                await fetch(`${AUTH_API_BASE}/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                // Clear the local session even if the network request fails.
            }

            Auth.clearSession();
            window.location.href = 'login.html';
        });
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    const onLoginPage = window.location.pathname.endsWith('/login.html');

    if (onLoginPage) {
        try {
            await Auth.verifySession();
            window.location.href = 'dashboard.html';
            return;
        } catch (error) {
            Auth.clearSession();
        }
    }

    const isAuthorized = await protectAdminPage();

    if (isAuthorized === false) {
        return;
    }

    fillAdminName();
    initLoginForm();
    initLogout();
    Auth.removePendingGuard();
});

window.Auth = Auth;
