import type { APIRoute } from "astro";

export const prerender = false;

type Locale = "en" | "ru";
type SubscriberStatus = "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk";

interface ServerCopy {
  invalidEmail: string;
  unavailable: string;
  general: string;
  pending: string;
  subscribed: string;
}

interface MailerLiteSuccess {
  data?: {
    status?: SubscriberStatus;
  };
}

interface ClientResponse {
  success: boolean;
  message: string;
}

const COPY: Record<Locale, ServerCopy> = {
  en: {
    invalidEmail: "Please enter a valid email address.",
    unavailable: "Subscription is temporarily unavailable. Please try again later.",
    general: "Something went wrong. Try again later.",
    pending: "Almost done! Check your email to confirm.",
    subscribed: "You're subscribed. Thanks!",
  },
  ru: {
    invalidEmail: "Пожалуйста, введите корректный email.",
    unavailable: "Подписка временно недоступна. Попробуйте позже.",
    general: "Что-то пошло не так. Попробуйте позже.",
    pending: "Почти готово! Проверьте почту и подтвердите подписку.",
    subscribed: "Вы подписаны. Спасибо!",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAILERLITE_ENDPOINT = "https://connect.mailerlite.com/api/subscribers";

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ru";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickEmail(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function json(body: ClientResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function apiKey(): string | undefined {
  return (
    nonEmpty(import.meta.env.MAILERLITE_API_KEY as string | undefined) ??
    nonEmpty(process.env.MAILERLITE_API_KEY)
  );
}

function groupIdFor(locale: Locale): string | undefined {
  if (locale === "ru") {
    return (
      nonEmpty(import.meta.env.MAILERLITE_GROUP_ID_RU as string | undefined) ??
      nonEmpty(process.env.MAILERLITE_GROUP_ID_RU)
    );
  }
  return (
    nonEmpty(import.meta.env.MAILERLITE_GROUP_ID_EN as string | undefined) ??
    nonEmpty(process.env.MAILERLITE_GROUP_ID_EN)
  );
}

export const POST: APIRoute = async ({ request }) => {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return json({ success: false, message: COPY.en.general }, 400);
  }

  const body = isRecord(parsed) ? parsed : {};
  const locale: Locale = isLocale(body.locale) ? body.locale : "en";
  const copy = COPY[locale];
  const email = pickEmail(body.email);

  if (!EMAIL_RE.test(email)) {
    return json({ success: false, message: copy.invalidEmail }, 400);
  }

  const key = apiKey();
  const groupId = groupIdFor(locale);
  if (!key || !groupId) {
    console.error("[subscribe] missing env", {
      hasApiKey: Boolean(key),
      hasGroupId: Boolean(groupId),
      locale,
    });
    return json({ success: false, message: copy.unavailable }, 503);
  }

  let mlResponse: Response;
  try {
    mlResponse = await fetch(MAILERLITE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ email, groups: [groupId] }),
    });
  } catch {
    return json({ success: false, message: copy.general }, 502);
  }

  if (mlResponse.ok) {
    const data = (await mlResponse.json().catch(() => null)) as MailerLiteSuccess | null;
    const status = data?.data?.status;
    const message = status === "unconfirmed" ? copy.pending : copy.subscribed;
    return json({ success: true, message }, 200);
  }

  if (mlResponse.status === 422) {
    return json({ success: false, message: copy.invalidEmail }, 400);
  }

  return json({ success: false, message: copy.general }, 502);
};
