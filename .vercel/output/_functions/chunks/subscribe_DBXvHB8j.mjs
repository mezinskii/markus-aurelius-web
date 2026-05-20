const prerender = false;
const COPY = {
  en: {
    invalidEmail: "Please enter a valid email address.",
    unavailable: "Subscription is temporarily unavailable. Please try again later.",
    general: "Something went wrong. Try again later.",
    pending: "Almost done! Check your email to confirm.",
    subscribed: "You're subscribed. Thanks!"
  },
  ru: {
    invalidEmail: "Пожалуйста, введите корректный email.",
    unavailable: "Подписка временно недоступна. Попробуйте позже.",
    general: "Что-то пошло не так. Попробуйте позже.",
    pending: "Почти готово! Проверьте почту и подтвердите подписку.",
    subscribed: "Вы подписаны. Спасибо!"
  }
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAILERLITE_ENDPOINT = "https://connect.mailerlite.com/api/subscribers";
function isLocale(value) {
  return value === "en" || value === "ru";
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function pickEmail(value) {
  return typeof value === "string" ? value.trim() : "";
}
function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
function nonEmpty(value) {
  return value && value.length > 0 ? value : void 0;
}
function apiKey() {
  return nonEmpty("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiNzNkYWI5OTc3ZTI3ZjZjNmY0NzNiZTdmOGE5YmJhNGNmNTY1ZDllMTE3ZmQ2MWZkMDNkM2Q5NTgxODQ4NGQzNjU0OGYwYjZiM2U0NzI1YTgiLCJpYXQiOjE3NzkwMzE2NDUuMzgxMTYzLCJuYmYiOjE3NzkwMzE2NDUuMzgxMTY3LCJleHAiOjQ5MzQ3MDUyNDUuMzczNzcxLCJzdWIiOiIyMzc0MjQzIiwic2NvcGVzIjpbXX0.WpaYpsXfwtNRpDSQ2xZl7j2LsAMIrAyHPCtQKVTlmj7BeyCYEWFU61dT4i4QRl6ynaM5RORHSAkaG0YBuaq83AK9hhEfdN2xz8Hmlx55FxyOYiS1wGJJ5HNG7Hork1RGG9EXPqoUVDXgau8nvXtU0q0-PAID_92O3ZRmGctNOav4qhmG7-ncOx22zOrJClkCf6pSyscMVIy84sA9dFXOx1syZkorkRui_vEbwOK4tRAYXZFDr7XmIEpI1etgHmp8XmFMhhdAi949PbTh6NGiFOF4SkFRW_JSrwWZPM1B2bMysq1wNUHyb2NHbrj8Y53Rr_41xFGdVQPoFtUC9VawSUo_UvTQHw_86yzW70f8YPjpOnaR65t5-VVVnlDxMde3hl21QJsWZ7MK5b-TFdMhZNw9m64-LMX6dyalXApvskJyEmaIkOVIdJTBZuQifom0hiCE9D00X-b0cUKTDKbzF5Lh3_Hf8_BR7Rk2S8AIP7iikWtmUWHT7s4yxsfyUKdPoxBY7NBP8pi5AoiTLiGdCJgyDAsw7GrT8ng5ldvZthk1bmXgEsLswXyOzWD4EpweSbR1ZFIhy-hF3q4lD0nJjhQQzWvM2MWoYl6Mnl8uoCEoTUYiB0xcN2sMjoeIT-vxf6QqssJ_A-pgWDPoBxONSG3QudLZ8niKUZgWJZ9C_Hc") ?? nonEmpty(process.env.MAILERLITE_API_KEY);
}
function groupIdFor(locale) {
  if (locale === "ru") {
    return nonEmpty("187728010112140670") ?? nonEmpty(process.env.MAILERLITE_GROUP_ID_RU);
  }
  return nonEmpty("187725307766114085") ?? nonEmpty(process.env.MAILERLITE_GROUP_ID_EN);
}
const POST = async ({ request }) => {
  let parsed;
  try {
    parsed = await request.json();
  } catch {
    return json({ success: false, message: COPY.en.general }, 400);
  }
  const body = isRecord(parsed) ? parsed : {};
  const locale = isLocale(body.locale) ? body.locale : "en";
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
      locale
    });
    return json({ success: false, message: copy.unavailable }, 503);
  }
  let mlResponse;
  try {
    mlResponse = await fetch(MAILERLITE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ email, groups: [groupId] })
    });
  } catch {
    return json({ success: false, message: copy.general }, 502);
  }
  if (mlResponse.ok) {
    const data = await mlResponse.json().catch(() => null);
    const status = data?.data?.status;
    const message = status === "unconfirmed" ? copy.pending : copy.subscribed;
    return json({ success: true, message }, 200);
  }
  if (mlResponse.status === 422) {
    return json({ success: false, message: copy.invalidEmail }, 400);
  }
  return json({ success: false, message: copy.general }, 502);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
