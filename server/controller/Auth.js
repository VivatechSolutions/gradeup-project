const {
  clearAuthCookies,
  loginStudent,
  registerIndependentStudent,
  revokeCurrentSession,
  rotateRefresh,
  serializeUser,
  setAuthCookies,
} = require("../services/studentAuthService");
const { authenticateStudentWithOAuth } = require("../services/studentOAuthService");
const { resendVerification, verifyStudentEmail } = require("../services/studentEmailVerificationService");
const { isValidStudentEmail, hasMailDomain } = require("../utils/studentEmail");

const controller = {
  async checkStudentEmail(req, res) {
    if (!isValidStudentEmail(req.body?.email)) return res.json({ valid: false, message: "Please enter a valid email address" });
    try {
      const valid = await hasMailDomain(req.body.email);
      return res.json({ valid, message: valid ? "" : "This email domain does not appear to receive mail" });
    } catch {
      return res.status(503).json({ message: "Unable to validate the email domain. Please try again." });
    }
  },
  async StudentRegister(req, res) {
    try {
      const { user } = await registerIndependentStudent(req.body, req);
      return res.status(201).json({
        status: true,
        message: "Account created. Check your email for a verification link before signing in.",
        data: { email: user.email, verificationPending: true },
      });
    } catch (error) {
      console.log(error);
      res
        .status(error.statusCode || 500)
        .json({ message: error.message || "Internal Server Error", code: error.code, status: false });
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
        .json({ message: error.message || "Internal Server Error", code: error.code, status: false });
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
  async resendStudentVerification(req, res) {
    try {
      await resendVerification(req.body?.email);
      return res.json({ status: true, message: "If this account is awaiting verification, a new link has been sent." });
    } catch {
      return res.status(503).json({ status: false, message: "Verification email is unavailable. Please try again later." });
    }
  },
  async verifyStudentEmail(req, res) {
    try {
      const verified = await verifyStudentEmail(req.body?.token);
      if (!verified) return res.status(400).json({ status: false, message: "Verification link is invalid or expired." });
      return res.json({ status: true, message: "Email verified. You can now sign in." });
    } catch {
      return res.status(503).json({ status: false, message: "Unable to verify email. Please try again." });
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
      const { user, tokens, created, verificationPending } = await authenticateStudentWithOAuth(
        { provider: "google", ...req.body },
        req,
      );
      if (verificationPending) return res.status(created ? 201 : 200).json({ status: true,
        message: "Check your email to verify this account before signing in.",
        data: { email: user.email, verificationPending: true } });
      setAuthCookies(res, tokens);
      return res.status(created ? 201 : 200).json({
        message: created ? "Student account created" : "Login successful",
        status: true,
        data: await serializeUser(user),
      });
    } catch (error) {
      console.log(error);
      res
        .status(error.statusCode || 500)
        .json({ message: error.message || "Internal Server Error", status: false });
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
      const { user, tokens, created, verificationPending } = await authenticateStudentWithOAuth(
        { provider: "microsoft", ...req.body },
        req,
      );
      if (verificationPending) return res.status(created ? 201 : 200).json({ status: true,
        message: "Check your email to verify this account before signing in.",
        data: { email: user.email, verificationPending: true } });
      setAuthCookies(res, tokens);
      return res.status(created ? 201 : 200).json({
        message: created ? "Student account created" : "Login successful",
        status: true,
        data: await serializeUser(user),
      });
    } catch (error) {
      console.log(error);
      res
        .status(error.statusCode || 500)
        .json({ message: error.message || "Internal Server Error", status: false });
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
