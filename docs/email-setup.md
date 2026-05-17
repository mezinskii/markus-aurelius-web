# Email subscription setup (MailerLite)

The `/api/subscribe` endpoint and `SubscribeForm.astro` component talk to MailerLite. To make them work you need a MailerLite account, an API token, and two groups (one for each language).

## 1. Get a MailerLite API token

1. Log in at <https://dashboard.mailerlite.com/>.
2. Open **Integrations → Developer API → API tokens**.
3. Click **Generate new token**, give it a name (e.g. `readaurelius-prod`).
4. Copy the token — you will not see it again. This is your `MAILERLITE_API_KEY`.

## 2. Create two groups

The form sends English subscribers to one MailerLite group and Russian subscribers to another. This lets you send separate newsletters in each language and keeps your stats clean.

1. Open **Subscribers → Groups**.
2. Click **Create group**, name it (for example `readaurelius-en`). Save.
3. Repeat for the Russian group (for example `readaurelius-ru`).

### Enable double opt-in (recommended)

For each group:

1. Open the group → **Settings**.
2. Enable **Double opt-in** so MailerLite emails a confirmation link to every new subscriber. The form copy already says "check your email to confirm" — match that promise here.

## 3. Find each group ID

The group ID is the numeric string in the URL when you open a group:

```
https://dashboard.mailerlite.com/groups/12345678/subscribers
                                       ^^^^^^^^
                                       this is the group ID
```

You can also fetch them via the API:

```bash
curl -H "Authorization: Bearer $MAILERLITE_API_KEY" \
     https://connect.mailerlite.com/api/groups
```

Note both IDs — they go in `MAILERLITE_GROUP_ID_EN` and `MAILERLITE_GROUP_ID_RU`.

## 4. Add env vars locally

Copy the example file and fill in the three values:

```bash
cp .env.example .env
```

Open `.env` and set:

```
MAILERLITE_API_KEY=...
MAILERLITE_GROUP_ID_EN=...
MAILERLITE_GROUP_ID_RU=...
```

`.env` is git-ignored. `.env.example` is committed and acts as the schema.

Run `npm run dev` and test the form — successful submission should show "Almost done!" and the subscriber should appear in MailerLite with status `unconfirmed`.

## 5. Add env vars to Vercel

In the Vercel dashboard for this project:

1. **Settings → Environment Variables**.
2. Add each of the three variables:
   - `MAILERLITE_API_KEY`
   - `MAILERLITE_GROUP_ID_EN`
   - `MAILERLITE_GROUP_ID_RU`
3. For each one, check **Production**, **Preview**, and **Development** (or pick whichever environments you actually deploy to).
4. Redeploy — env var changes do not apply to existing deployments.

## How the endpoint behaves

`POST /api/subscribe` with JSON `{ email, locale }`:

- Invalid email → `400 { success: false, message }` with the localized "invalid email" copy.
- New subscriber → `200 { success: true, message }` with the "check your email" copy. MailerLite sends the confirmation email (double opt-in).
- Already an active subscriber → `200 { success: true, message }` with the "you're already subscribed" copy.
- Missing env vars on the server → `503 { success: false, message }` with the "temporarily unavailable" copy. Check Vercel env settings.
- MailerLite outage / other error → `502 { success: false, message }` with the generic error copy. No upstream API details are leaked to the client.
