import authService from "../services/auth.service.js";



export const login = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const data  = await authService.login(identifier, password);
    return res.json({ data, success: true, message: "Đăng nhập thành công" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, data: null });
  }
}


export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) throw new Error('Refresh token is required');
    await authService.logout(refreshToken);
    res.json({ message: 'Logout successful', success: true, data: null });
  } catch (error) {
    console.log(error.message);

    res.status(400).json({ message: error.message, success: false, data: null });
  }
}

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) throw new Error('Refresh token is required');
    const data = await authService.refreshToken(refreshToken);
    return res.json({ data, success: true, message: "refresh token thành công" });
  } catch (error) {
    res.status(400).json({ message: error.message, success: false, data: null });
  }
}



