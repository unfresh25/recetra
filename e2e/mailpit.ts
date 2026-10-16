const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitList = { messages: { ID: string; To: { Address: string }[] }[] };

/** Polls the local Supabase inbox (Mailpit) for the latest OTP sent to `email`. */
export async function readOtp(email: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (
      await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`)
    ).json()) as MailpitList;
    const message = list.messages?.[0];
    if (message) {
      const full = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json()) as {
        Text: string;
        HTML: string;
      };
      const code = (full.Text || full.HTML).match(/\b\d{6}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No OTP email for ${email}`);
}
