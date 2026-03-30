import jwt from 'jsonwebtoken'

const parseCookieHeader = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};

  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;

    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

const extractBearerToken = (rawToken = '') => {
  if (!rawToken || typeof rawToken !== 'string') return '';

  const token = rawToken.trim();
  if (!token) return '';

  if (/^Bearer\s+/i.test(token)) {
    return token.replace(/^Bearer\s+/i, '').trim();
  }

  return token;
}

export const getToken = ({
  headers = {},
  cookies = {},
  connectionParams = {},
  cookieName = 'accessToken',
} = {}) => {
  const cookieToken =
    cookies?.[cookieName] ||
    cookies?.accessToken ||
    cookies?.token;
  
  if (cookieToken) {
    return extractBearerToken(cookieToken);
  }

  const parsedCookies = parseCookieHeader(headers?.cookie || headers?.Cookie || '');
  const tokenFromCookieHeader =
    parsedCookies[cookieName] ||
    parsedCookies.accessToken ||
    parsedCookies.token;

  if (tokenFromCookieHeader) {
    return extractBearerToken(tokenFromCookieHeader);
  }

  const authHeader =
    headers?.authorization ||
    headers?.Authorization ||
    connectionParams?.authorization ||
    connectionParams?.Authorization ||
    connectionParams?.token ||
    '';

  return extractBearerToken(authHeader);
}


export const generateAccessToken = (data) => {
  const payload = {
    ...data
  };
  const secret = process.env.ACCESS_TOKEN_SECRET;
    const options = {
    expiresIn: '15m', 
  };
  return jwt.sign(payload, secret, options);
}


export const verifyAccessToken = (token) => {
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

export const generateRefreshToken = (data) => {
  const payload = {
    ...data
  };
  const secret = process.env.REFRESH_TOKEN_SECRET;
    const options = {
    expiresIn: '7d', 
  };
  return jwt.sign(payload, secret, options);
}

export const verifyRefreshToken = (token) => {
  try {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}