function layoutTemplate({ title, intro, content, actionLabel, actionUrl, footerNote }) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#edf3f8;font-family:Arial,sans-serif;color:#102033;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#edf3f8;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dbe6f2;">
                <tr>
                  <td style="padding:28px 32px;background:linear-gradient(135deg,#183b63,#2c71f0);color:#ffffff;">
                    <div style="width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
                      Logo
                    </div>
                    <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;">${title}</h1>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.84);">${intro}</p>
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
                              <td style="border-radius:14px;background:#2c71f0;">
                                <a href="${actionUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;">
                                  ${actionLabel}
                                </a>
                              </td>
                            </tr>
                          </table>
                        `
                        : ""
                    }
                    <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#5f738c;">${footerNote}</p>
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
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello ${name || "there"},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      Your GradeUp admin account has been created. Use the credentials below to sign in.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dbe6f2;border-radius:18px;background:#f8fbfe;margin:20px 0;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Email</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#102033;">${email}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#5f738c;">Temporary Password</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#102033;">${password}</p>
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
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hello ${name || "there"},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
      We received a request to reset your GradeUp admin password. Use the button below to continue.
    </p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#5f738c;">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${resetUrl}" style="color:#2c71f0;">${resetUrl}</a>
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

module.exports = {
  getAdminWelcomeEmail,
  getDebateInviteEmail,
  getPasswordResetEmail,
};
