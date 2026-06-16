const studentModel = require("../model/Student");
const teacherModel = require("../model/Teacher");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const { sendEmail } = require("../config/EmailTransporter");
const { getStudentPasswordResetEmail } = require("../config/EmailTemplate");
const {
  signUserToken,
  signStudentPasswordResetToken,
  verifyStudentPasswordResetToken,
} = require("../utils/authTokens");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getAppUrl() {
  return process.env.FE_URL || process.env.CLIENT_URL || "http://localhost:3000";
}

function getStudentName(body) {
  return (
    body.name ||
    [body.firstName, body.lastName].filter(Boolean).join(" ").trim() ||
    body.username ||
    ""
  );
}

function normalizeBoard(board) {
  if (!board) return "";
  if (String(board).toLowerCase().includes("state")) return "State";
  if (String(board).toUpperCase() === "CBSE") return "CBSE";
  return String(board).trim();
}

function buildStudentResponse(student, token) {
  return {
    id: student._id,
    _id: student._id,
    studentId: student.studentId,
    username: student.name || student.email,
    name: student.name,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    role: "student",
    class: student.class,
    grade: student.grade,
    board: student.board,
    school: student.school,
    subjects: student.subjects || [],
    token,
  };
}

function buildTeacherResponse(teacher, token) {
  return {
    id: teacher._id,
    _id: teacher._id,
    teacherId: teacher.teacherId,
    email: teacher.email,
    role: "teacher",
    school: teacher.school,
    token,
  };
}

async function findStudentByCandidate(candidateId) {
  if (!candidateId) return null;
  const filters = [{ studentId: candidateId }, { email: candidateId }];
  if (mongoose.isValidObjectId(candidateId)) {
    filters.push({ _id: candidateId });
  }
  return studentModel.findOne({ $or: filters }).catch(() => null);
}

async function verifyGoogleUser(req) {
  const idToken = req.body?.credential || req.body?.idToken || req.body?.token;
  if (idToken && process.env.GOOGLE_CLIENT_ID) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  }
  return {
    email: req.body?.email,
    given_name: req.body?.firstName,
    family_name: req.body?.lastName,
    name: req.body?.name,
    sub: req.body?.googleId,
  };
}

const controller = {
  async StudentRegister(req, res) {
    try {
      const email = req.body?.email?.toLowerCase()?.trim();
      const password = req.body?.password;
      const classValue = req.body?.class || req.body?.grade;
      const board = normalizeBoard(req.body?.board);

      if (!email || !password || !classValue || !board || !req.body?.school) {
        return res.status(400).json({
          status: false,
          message: "email, password, class, board and school are required",
        });
      }

      if (!["State", "CBSE"].includes(board)) {
        return res.status(400).json({ status: false, message: "Only State and CBSE boards are supported" });
      }

      const exists = await studentModel.findOne({ email });
      if (exists) {
        return res.status(409).json({ status: false, message: "Email already registered" });
      }

      const firstName = req.body?.firstName?.trim() || "";
      const lastName = req.body?.lastName?.trim() || "";
      const student = await studentModel.create({
        name: getStudentName(req.body),
        firstName,
        lastName,
        email,
        password: await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 10)),
        class: String(classValue),
        grade: String(classValue),
        board,
        school: req.body.school,
        phoneNumber: req.body.phoneNumber,
        studentId: req.body.studentId || `STU-${Date.now()}`,
        subjects: Array.isArray(req.body.subjects) ? req.body.subjects : [],
      });
      const token = signUserToken(student, "student");
      return res.status(201).json({ status: true, message: "Registration successful", data: buildStudentResponse(student, token) });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async teacherRegister(req, res) {
    try {
      return res.status(501).json({ status: false, message: "Teacher authentication flow is unchanged" });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async StudentLogin(req, res) {
    try {
      const email = req.body?.email?.toLowerCase()?.trim();
      const password = req.body?.password;
      if (!email || !password) {
        return res.status(400).json({ status: false, message: "email and password are required" });
      }
      const student = await studentModel.findOne({ email });
      if (!student || !student.password) {
        return res.status(401).json({ status: false, message: "Invalid credentials" });
      }
      const ok = await bcrypt.compare(password, student.password);
      if (!ok) return res.status(401).json({ status: false, message: "Invalid credentials" });
      student.lastLoginAt = new Date();
      await student.save();
      const token = signUserToken(student, "student");
      return res.status(200).json({ status: true, message: "Login successful", data: buildStudentResponse(student, token) });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async teacherLogin(req, res) {
    try {
      const email = req.body?.email?.toLowerCase()?.trim();
      const password = req.body?.password;
      if (!email || !password) {
        return res.status(400).json({ status: false, message: "email and password are required" });
      }
      const teacher = await teacherModel.findOne({ email });
      if (!teacher || !teacher.password) {
        return res.status(401).json({ status: false, message: "Invalid credentials" });
      }
      const ok = await bcrypt.compare(password, teacher.password);
      if (!ok) return res.status(401).json({ status: false, message: "Invalid credentials" });
      const token = signUserToken(teacher, "teacher");
      return res.status(200).json({ status: true, message: "Login successful", data: buildTeacherResponse(teacher, token) });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async forgotPassword(req, res) {
    try {
      const email = req.body?.email?.toLowerCase()?.trim();
      if (!email) return res.status(400).json({ status: false, message: "email is required" });
      const student = await studentModel.findOne({ email });
      if (student) {
        const issuedAt = Date.now();
        student.passwordResetIssuedAt = new Date(issuedAt);
        await student.save();
        const token = signStudentPasswordResetToken(student, issuedAt);
        const appUrl = getAppUrl();
        const resetUrl = `${appUrl}/forgot-password?token=${encodeURIComponent(token)}`;
        const emailContent = getStudentPasswordResetEmail({ name: student.name, resetUrl, appUrl });
        await sendEmail({ to: student.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      }
      return res.status(200).json({ status: true, message: "If that email exists, a reset link has been sent" });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async studentGoogleLogin(req, res) {
    try {
      const profile = await verifyGoogleUser(req);
      const email = profile?.email?.toLowerCase()?.trim();
      if (!email) return res.status(400).json({ status: false, message: "Google email is required" });
      let student = await studentModel.findOne({ email });
      if (!student) {
        const classValue = req.body?.class || req.body?.grade;
        const board = normalizeBoard(req.body?.board);
        if (!classValue || !board || !req.body?.school) {
          return res.status(400).json({ status: false, message: "class, board and school are required for first Google sign-in" });
        }
        student = await studentModel.create({
          name: profile.name || getStudentName(req.body),
          firstName: profile.given_name || req.body?.firstName || "",
          lastName: profile.family_name || req.body?.lastName || "",
          email,
          class: String(classValue),
          grade: String(classValue),
          board,
          school: req.body.school,
          studentId: req.body.studentId || `STU-${Date.now()}`,
          googleId: profile.sub,
          authProvider: "google",
        });
      }
      student.lastLoginAt = new Date();
      await student.save();
      const token = signUserToken(student, "student");
      return res.status(200).json({ status: true, message: "Google login successful", data: buildStudentResponse(student, token) });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error, status: false });
    }
  },
  async TeacherGoogleLogin(req, res) {
    try {
      return res.status(501).json({ status: false, message: "Teacher Google authentication flow is unchanged" });
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
  async me(req, res) {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ status: false, message: "Unauthorized" });
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || "gradeup-dev-secret");
      if (decoded.role === "teacher") {
        const teacher = await teacherModel.findById(decoded.userId);
        if (!teacher) return res.status(401).json({ status: false, message: "Unauthorized" });
        return res.status(200).json({ status: true, data: buildTeacherResponse(teacher, token) });
      }
      const student = await studentModel.findById(decoded.userId);
      if (!student) return res.status(401).json({ status: false, message: "Unauthorized" });
      return res.status(200).json({ status: true, data: buildStudentResponse(student, token) });
    } catch (error) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }
  },
  async verifyResetToken(req, res) {
    try {
      const decoded = verifyStudentPasswordResetToken(req.query?.token);
      const student = await studentModel.findById(decoded.studentId);
      const issuedAt = student?.passwordResetIssuedAt?.getTime();
      if (!student || !issuedAt || issuedAt !== decoded.issuedAt) {
        return res.status(400).json({ status: false, message: "Reset link is invalid" });
      }
      return res.status(200).json({ status: true, data: { email: student.email, name: student.name, valid: true } });
    } catch (error) {
      return res.status(400).json({ status: false, message: "Reset link is invalid or expired" });
    }
  },
  async resetPassword(req, res) {
    try {
      const token = req.body?.token;
      const newPassword = req.body?.newPassword || req.body?.password;
      if (!token || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ status: false, message: "token and an 8 character newPassword are required" });
      }
      const decoded = verifyStudentPasswordResetToken(token);
      const student = await studentModel.findById(decoded.studentId);
      const issuedAt = student?.passwordResetIssuedAt?.getTime();
      if (!student || !issuedAt || issuedAt !== decoded.issuedAt) {
        return res.status(400).json({ status: false, message: "Reset link is invalid" });
      }
      student.password = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS || 10));
      student.passwordResetIssuedAt = null;
      await student.save();
      return res.status(200).json({ status: true, message: "Password reset successfully" });
    } catch (error) {
      return res.status(400).json({ status: false, message: "Reset link is invalid or expired" });
    }
  },
};

module.exports = controller;
