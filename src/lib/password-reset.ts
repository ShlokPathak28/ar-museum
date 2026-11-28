import "server-only";

import { isMailConfigured, sendMail } from "@/lib/email";
import { siteName } from "@/lib/site";

type ResetUser = { name: string; email: string };
type ResetRequest = { user: ResetUser; url: string; token: string };

/**
 * Better Auth creates the token, stores it with an expiry and consumes it on
 * the first successful reset. This module only decides how the link reaches the
 * person: SendGrid in production, the server log in development.
 */
export function canDeliverPasswordResetEmails(): boolean {
  // A developer without a SendGrid key still gets a usable flow: the link is
  // printed by `sendPasswordResetEmail` instead of posted. Production must not
  // fall back to the log, because that would either leak a live token or
  // silently accept a request that can never result in an email.
  return isMailConfigured() || process.env.NODE_ENV !== "production";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * The link Better Auth hands us points at its callback route, which then
 * redirects to the app. Going straight to the page keeps the URL in the email
 * short and removes a redirect from the one path a locked-out visitor takes.
 */
function resetLinkFrom(url: string, token: string): string {
  const link = new URL(url);
  link.pathname = "/reset-password";
  link.search = new URLSearchParams({ token }).toString();
  link.hash = "";
  return link.toString();
}

export async function sendPasswordResetEmail({ user, url, token }: ResetRequest): Promise<void> {
  const link = resetLinkFrom(url, token);

  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Password-reset email is not configured: set SENDGRID_API_KEY and MAIL_FROM.");
    }

    // No token ever reaches a production log; this branch is development only.
    console.info(`[password reset] ${user.email} → ${link}`);
    return;
  }

  const name = user.name.trim() || "there";
  const subject = `Reset your ${siteName} password`;
  const text = [
    `Hello ${name},`,
    "",
    `Someone asked to reset the password for your ${siteName} account (${user.email}).`,
    "",
    link,
    "",
    "This link expires in one hour and works once. If you did not ask, ignore this email — your password stays as it is.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f2ede3;color:#1e1b17;font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8c2f22">
        ${escapeHtml(siteName)}
      </p>
      <h1 style="margin:12px 0 0;font-size:32px;line-height:1.1;font-weight:400">
        Reset your password
      </h1>
      <p style="margin:24px 0 0;font-size:16px;line-height:1.65">
        Hello ${escapeHtml(name)},
      </p>
      <p style="margin:12px 0 0;font-size:16px;line-height:1.65">
        Someone asked to reset the password for your ${escapeHtml(siteName)} account
        (${escapeHtml(user.email)}).
      </p>
      <p style="margin:28px 0 0">
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#1e1b17;color:#f2ede3;padding:12px 20px;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:14px">
          Choose a new password
        </a>
      </p>
      <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#5b544b">
        This link expires in one hour and works once. If you did not ask, ignore this email — your
        password stays as it is.
      </p>
      <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #d8d0c3;font-size:12px;line-height:1.6;color:#5b544b;word-break:break-all">
        If the button does not work, paste this address into your browser:<br />
        ${escapeHtml(link)}
      </p>
    </div>
  </body>
</html>`;

  await sendMail({ to: user.email, subject, text, html });
}
