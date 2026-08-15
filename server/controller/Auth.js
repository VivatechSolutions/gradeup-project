const {
  clearAuthCookies,
  loginStudent,
  registerIndependentStudent,
  revokeCurrentSession,
  rotateRefresh,
  serializeUser,
  setAuthCookies,
} = require("../services/studentAuthService");

const controller = {
  async StudentRegister(req, res) {
    try {
      const { user, tokens } = await registerIndependentStudent(req.body, req);
      setAuthCookies(res, tokens);
      return res.status(201).json({
        status: true,
        message: "Student account created",
        data: await serializeUser(user),
      });
    } catch (error) {
      console.log(error);
      res
        .status(error.statusCode || 500)
        .json({ message: error.message || "Internal Server Error", status: false });
    }
  },
  async teacherRegister(req, res) {
    try {
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async StudentLogin(req, res) {
    try {
      const { user, tokens } = await loginStudent(req.body, req);
      setAuthCookies(res, tokens);
      return res.status(200).json({
        status: true,
        message: "Login successful",
        data: await serializeUser(user),
      });
    } catch (error) {
      console.log(error);
      res
        .status(error.statusCode || 500)
        .json({ message: error.message || "Internal Server Error", status: false });
    }
  },
  async teacherLogin(req, res) {
    try {
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async forgotPassword(req, res) {
    try {
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async me(req, res) {
    return res.status(200).json({
      status: true,
      data: req.authUser.user,
    });
  },
  async refresh(req, res) {
    try {
      const refreshed = await rotateRefresh(req);
      if (!refreshed) {
        clearAuthCookies(res);
        return res.status(401).json({ status: false, message: "Authentication required" });
      }
      setAuthCookies(res, refreshed.tokens);
      return res.status(200).json({
        status: true,
        data: await serializeUser(refreshed.user),
      });
    } catch (error) {
      clearAuthCookies(res);
      return res.status(401).json({ status: false, message: "Authentication required" });
    }
  },
  async logout(req, res) {
    await revokeCurrentSession(req).catch(() => null);
    clearAuthCookies(res);
    return res.status(200).json({ status: true, message: "Logout successful" });
  },
  async studentGoogleLogin(req, res) {
    try {
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async TeacherGoogleLogin(req, res) {
    try {
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async studentMicrosoftLogin(req, res) {
    try {
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async TeacherMicrosoftLogin(req, res) {
    try {
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
};

module.exports = controller;
