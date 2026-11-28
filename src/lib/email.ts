import "server-only";

import { env } from "@/lib/env";

/**
 * The one outbound mail path.
 *
 * Resend is called over plain `fetch` rather than through its SDK: the app sends
 * a single message type, and a dependency would add a package, a version to keep
 * current and a second way to configure the same token. The API key and sender
 * stay in the environment, never in the repository.
 */
export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** True only when this deployment can actually deliver a message. */
export function isMailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Mail is not configured: set RESEND_API_KEY and MAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
    // A password-reset request should fail in seconds, not hang a function until
    // the platform's own timeout. The caller turns a failure into an honest
    // "try again" message.
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Resend refused the message (${response.status}): ${detail}`);
  }
}
