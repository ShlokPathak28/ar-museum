import "server-only";

import { env } from "@/lib/env";
import { parseMailFrom } from "@/lib/mail-from";

/**
 * The one outbound mail path.
 *
 * SendGrid is called over plain `fetch` rather than through its SDK: the app
 * sends a single message type, and a dependency would add a package, a version
 * to keep current and a second way to configure the same token. A Single Sender
 * is enough here — it is verified by email, so no DNS domain is required. The
 * API key and sender stay in the environment, never in the repository.
 */
export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** True only when this deployment can actually deliver a message. */
export function isMailConfigured(): boolean {
  return Boolean(env.SENDGRID_API_KEY && env.MAIL_FROM);
}

export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = env.SENDGRID_API_KEY;
  const from = env.MAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Mail is not configured: set SENDGRID_API_KEY and MAIL_FROM.");
  }

  const sender = parseMailFrom(from);

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: mail.to }], subject: mail.subject }],
      from: { email: sender.email, ...(sender.name ? { name: sender.name } : {}) },
      content: [
        { type: "text/plain", value: mail.text },
        { type: "text/html", value: mail.html },
      ],
    }),
    // A password-reset request should fail in seconds, not hang a function until
    // the platform's own timeout. The caller turns a failure into an honest
    // "try again" message.
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    let detail = body;

    try {
      const parsed = JSON.parse(body) as { errors?: { message?: string }[] };
      const messages = parsed.errors?.map((error) => error.message).filter(Boolean);
      if (messages?.length) detail = messages.join("; ");
    } catch {
      // Not JSON (or truncated) — the raw body is still the best clue.
    }

    throw new Error(`SendGrid refused the message (${response.status}): ${detail}`);
  }
}
