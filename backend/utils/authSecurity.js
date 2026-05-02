// Shared helpers for strict admin authentication and session handling.
const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = 'viswashanthi_admin_session';
const DEFAULT_JWT_SECRET = 'viswashanthi-secret';
const DEFAULT_JWT_EXPIRES_IN = '1d';

let hasWarnedAboutDefaultSecret = false;

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (secret) {
        return secret;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be configured in production.');
    }

    if (!hasWarnedAboutDefaultSecret) {
        hasWarnedAboutDefaultSecret = true;
        console.warn('JWT_SECRET is not set. Falling back to the development secret. Configure JWT_SECRET before deployment.');
    }

    return DEFAULT_JWT_SECRET;
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;

const parseExpiryToMs = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value * 1000;
    }

    if (typeof value !== 'string') {
        return 24 * 60 * 60 * 1000;
    }

    const normalized = value.trim().toLowerCase();
    const match = normalized.match(/^(\d+)(ms|s|m|h|d)?$/);

    if (!match) {
        return 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2] || 's';
    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return amount * multipliers[unit];
};

const signAdminToken = (admin) =>
    jwt.sign(
        {
            id: admin._id,
            role: admin.role,
            sessionVersion: admin.sessionVersion || 0
        },
        getJwtSecret(),
        {
            expiresIn: getJwtExpiresIn()
        }
    );

const verifyAdminToken = (token) => jwt.verify(token, getJwtSecret());

const getCookieOptions = (req) => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    path: '/',
    maxAge: parseExpiryToMs(getJwtExpiresIn())
});

const setAuthCookie = (res, req, token) => {
    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(req));
};

const clearAuthCookie = (res, req) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
        ...getCookieOptions(req),
        maxAge: undefined
    });
};

const getCookieValue = (req, name) => {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';');

    for (const cookie of cookies) {
        const [rawName, ...rawValue] = cookie.trim().split('=');

        if (rawName === name) {
            return decodeURIComponent(rawValue.join('='));
        }
    }

    return null;
};

const extractTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }

    return getCookieValue(req, AUTH_COOKIE_NAME);
};

module.exports = {
    AUTH_COOKIE_NAME,
    clearAuthCookie,
    extractTokenFromRequest,
    getJwtSecret,
    setAuthCookie,
    signAdminToken,
    verifyAdminToken
};
