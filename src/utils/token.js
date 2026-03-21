import jwt from 'jsonwebtoken'


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