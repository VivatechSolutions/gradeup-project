function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function layoutTemplate({ title, intro, content, actionLabel, actionUrl, footerNote }) {
  const appUrl = process.env.FE_URL || process.env.APP_URL || process.env.FRONTEND_URL || "";
  let logoUrl = "";
  try { const parsed = new URL(appUrl); if (parsed.protocol === "https:") logoUrl = new URL("/gradeup-email-logo.png", parsed).toString(); } catch { /* text fallback */ }
  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f5f8ff;font-family:Arial,sans-serif;color:#14213d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f5f8ff;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbeafe;">
                <tr>
                  <td style="padding:28px 32px;background:#eff6ff;border-bottom:4px solid #2563eb;color:#14213d;">
                    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="GradeUp" width="190" style="display:block;width:190px;max-width:100%;height:auto;margin:0 0 8px;" />` : `<div style="font-size:24px;font-weight:700;color:#2563eb;">GradeUp!</div>`}
                    <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;">${escapeHtml(title)}</h1>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;">${escapeHtml(intro)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    ${content}
                    ${
                      actionLabel && actionUrl
                        ? `
                          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 20px;">
                            <tr>
                              <td style="border-radius:12px;background:#2563eb;">
                                <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;">
                                  ${escapeHtml(actionLabel)}
                                </a>
                              </td>
                            </tr>
                          </table>
                        `
                        : ""
                    }
                    <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b;">${escapeHtml(footerNote)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getAdminWelcomeEmail({ name, email, password, appUrl }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello ${escapeHtml(name || "there")},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      Your GradeUp admin account has been created. Use the credentials below to sign in.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dbe6f2;border-radius:18px;background:#f8fbfe;margin:20px 0;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Email</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#102033;">${escapeHtml(email)}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Temporary Password</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#102033;">${escapeHtml(password)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:15px;line-height:1.7;">
      For security, you will be asked to reset your password the first time you log in.
    </p>
  `;

  return {
    subject: "Your GradeUp Admin Account",
    text: `Your GradeUp admin account is ready.\nEmail: ${email}\nTemporary Password: ${password}\nVisit App: ${appUrl}\nYou will be asked to reset your password on first login.`,
    html: layoutTemplate({
      title: "Welcome to GradeUp Admin",
      intro: "Your access is ready. Sign in with your temporary credentials and finish setup by resetting your password.",
      content,
      actionLabel: "Visit App",
      actionUrl: appUrl,
      footerNote: "If you were not expecting this account, please contact your system administrator.",
    }),
  };
}

function getPasswordResetEmail({ name, resetUrl, appUrl }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello ${escapeHtml(name || "there")},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      We received a request to reset your GradeUp admin password. Use the button below to continue.
    </p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#5f738c;">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${escapeHtml(resetUrl)}" style="color:#2c71f0;">${escapeHtml(resetUrl)}</a>
    </p>
    <p style="margin:0;font-size:15px;line-height:1.7;">
      If you did not request this, you can ignore this email and your password will remain unchanged.
    </p>
  `;

  return {
    subject: "Reset Your GradeUp Admin Password",
    text: `Reset your password: ${resetUrl}\nIf you did not request this, you can ignore this email.\nAdmin app: ${appUrl}`,
    html: layoutTemplate({
      title: "Reset Your Password",
      intro: "Secure your GradeUp admin account by choosing a new password.",
      content,
      actionLabel: "Reset Password",
      actionUrl: resetUrl,
      footerNote: "This link is intended only for the recipient of this email.",
    }),
  };
}

function getStudentWelcomeEmail({ name, appUrl, board, classNumber }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello ${escapeHtml(name || "there")},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      Your GradeUp student account is ready. We have set up your independent learning space so you can start exploring books, debates, seminars, and progress tracking.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dbe6f2;border-radius:18px;background:#f8fbfe;margin:20px 0;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Board</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#102033;">${escapeHtml(board || "Selected during signup")}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Class</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#102033;">${escapeHtml(classNumber || "Selected during signup")}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:15px;line-height:1.7;">
      School access is not activated automatically from signup. If your school later invites you, it will link to this same account safely.
    </p>
  `;

  return {
    subject: "Welcome to GradeUp",
    text: `Welcome to GradeUp, ${name || "student"}.\nBoard: ${board || ""}\nClass: ${classNumber || ""}\nOpen GradeUp: ${appUrl || ""}`,
    html: layoutTemplate({
      title: "Welcome to GradeUp",
      intro: "Your student learning space is ready.",
      content,
      actionLabel: appUrl ? "Open GradeUp" : null,
      actionUrl: appUrl,
      footerNote: "If you did not create this account, please contact GradeUp support.",
    }),
  };
}

function getStudentVerificationEmail({ name, verifyUrl }) {
  const content = `<p>Hello ${escapeHtml(name || "there")},</p>
    <p>Confirm this email address to activate your GradeUp student account.</p>
    <p>If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(verifyUrl)}">${escapeHtml(verifyUrl)}</a></p>
    <p>If you did not create an account, you can ignore this message.</p>`;
  return {
    subject: "Verify your GradeUp email",
    text: `Verify your GradeUp email within 24 hours: ${verifyUrl}\nIf you did not create an account, ignore this message.`,
    html: layoutTemplate({ title: "Verify Your Email", intro: "One more step before you start learning.", content,
      actionLabel: "Verify Email", actionUrl: verifyUrl, footerNote: "This link expires after 24 hours and works only once." }),
  };
}

function getStudentPasswordResetEmail({ name, resetUrl }) {
  const content = `<p>Hello ${escapeHtml(name || "there")},</p>
    <p>We received a request to reset your GradeUp student password.</p>
    <p>If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
    <p>If you did not request this, you can ignore this email.</p>`;
  return {
    subject: "Reset your GradeUp password",
    text: `Reset your GradeUp password within 15 minutes: ${resetUrl}\nIf you did not request this, ignore this email.`,
    html: layoutTemplate({ title: "Reset Your Password", intro: "Choose a new password for your GradeUp account.", content,
      actionLabel: "Reset Password", actionUrl: resetUrl, footerNote: "This link expires after 15 minutes and works only once." }),
  };
}

function getDebateInviteEmail({ senderName, debateTopic, debateType, joinUrl, appName = "GradeUp" }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello,</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      ${senderName || "A GradeUp learner"} has invited you to join a debate session on ${appName}.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dbe6f2;border-radius:18px;background:#f8fbfe;margin:20px 0;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Debate Topic</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#102033;">${debateTopic || "Topic will be shared in the room"}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Debate Type</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#102033;">${debateType || "Debate Session"}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#5f738c;">
      If the button does not work, open this link directly:<br />
      <a href="${joinUrl}" style="color:#2c71f0;">${joinUrl}</a>
    </p>
  `;

  return {
    subject: `${senderName || "A learner"} invited you to a GradeUp debate`,
    text: `Join the debate on ${appName}.\nTopic: ${debateTopic || "Debate Session"}\nType: ${debateType || "Debate"}\nJoin: ${joinUrl}`,
    html: layoutTemplate({
      title: "You’re invited to a debate",
      intro: "Join the session, review the topic, and jump into the discussion when you're ready.",
      content,
      actionLabel: "Join Debate",
      actionUrl: joinUrl,
      footerNote: "If you were not expecting this invitation, you can safely ignore this email.",
    }),
  };
}

function getGroupInviteEmail({ inviterName, groupName, joinUrl, appName = "GradeUp" }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello,</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      ${inviterName || "A GradeUp learner"} invited you to join the <strong>${groupName || "study group"}</strong> group chat on ${appName}.
    </p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#5f738c;">
      You will be asked to confirm before joining. If the button does not work, open this link directly:<br />
      <a href="${joinUrl}" style="color:#2c71f0;">${joinUrl}</a>
    </p>
  `;

  return {
    subject: `${inviterName || "A learner"} invited you to a GradeUp group`,
    text: `Join ${groupName || "the study group"} on ${appName}: ${joinUrl}`,
    html: layoutTemplate({
      title: "You’re invited to a group chat",
      intro: "Join the study conversation when you're ready.",
      content,
      actionLabel: "Review Invite",
      actionUrl: joinUrl,
      footerNote: "If you were not expecting this invitation, you can safely ignore this email.",
    }),
  };
}

function getSessionInviteEmail({ senderName, sessionType, topic, joinUrl, appName = "GradeUp" }) {
  const label = sessionType === "seminar" ? "seminar session" : "debate session";
  const title = sessionType === "seminar" ? "You’re invited to a seminar" : "You’re invited to a debate";
  const actionLabel = sessionType === "seminar" ? "Join Seminar" : "Join Debate";
  const content = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello,</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      ${senderName || "A GradeUp learner"} invited you to join a ${label} on ${appName}.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dbe6f2;border-radius:18px;background:#f8fbfe;margin:20px 0;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Topic</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#102033;">${topic || "Session topic"}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#5f738c;">
      If the button does not work, open this link directly:<br />
      <a href="${joinUrl}" style="color:#2c71f0;">${joinUrl}</a>
    </p>
  `;

  return {
    subject: `${senderName || "A learner"} invited you to a GradeUp ${sessionType === "seminar" ? "seminar" : "debate"}`,
    text: `Join the ${label} on ${appName}.\nTopic: ${topic || "Session topic"}\nJoin: ${joinUrl}`,
    html: layoutTemplate({
      title,
      intro: "Open the session link and join when you're ready.",
      content,
      actionLabel,
      actionUrl: joinUrl,
      footerNote: "If you were not expecting this invitation, you can safely ignore this email.",
    }),
  };
}

module.exports = {
  getAdminWelcomeEmail,
  getDebateInviteEmail,
  getGroupInviteEmail,
  getSessionInviteEmail,
  getPasswordResetEmail,
  getStudentWelcomeEmail,
  getStudentVerificationEmail,
  getStudentPasswordResetEmail,
};
