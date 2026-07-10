# Fare Tessile Hub

Premium B2B SaaS interface for performance marketing operations.

## Tech
- Next.js + TypeScript + Tailwind CSS
- Modular architecture with `app`, `components`, `features`, `services`, `adapters`, `mocks`, `types`
- Mocked AI action endpoint ready for provider swap

## Run
```bash
npm install
npm run dev
```

## Supermetrics setup
Add your API key in environment variables before using the Supermetrics account sync in the Integrations page:

```bash
SUPERMETRICS_API_KEY=your_api_key_here
```

Then open Integrations and use **Supermetrics Accounts Sync** to load accounts by data source.
Current built-in data source IDs in UI: `FA` (Meta Ads) and `AW` (Google Ads).

### If Supermetrics returns Facebook login/re-auth errors
If you see an error similar to:

`You cannot access the app till you log in to www.facebook.com and follow the instructions given.`

it means your Meta/Facebook connection inside Supermetrics needs re-authentication (this is done in Supermetrics/Facebook, not in this app). Fix flow:
1. Open your Supermetrics Hub connection settings for Meta Ads.
2. Reconnect / re-authenticate the data source.
3. Complete Facebook login and grant the requested permissions again.
4. Return to this app and retry the sync/query.

> Important: API scopes like `ds_queries_run`/`ds_accounts_read` are necessary but not sufficient.  
> If the underlying Meta login session is stale/invalid, Supermetrics can still return `QUERY_ERROR` until that specific login is reconnected.

If you get `QUERY_AUTH_NOT_FOUND` (`Unable to find any data source authentications`), it means the current API key/team does not have any active login for that `ds_id` (for example, `FA` or `AW`):
1. Connect a login in Supermetrics Hub for that source.
2. Ensure the API key belongs to the same Supermetrics team/workspace.
3. Retry the query after login is visible in Hub.

If a direct `addon.supermetrics.com/team/connect/...` URL does not load, it may be an expired or closed login link.  
The app now tries to generate a fresh login link automatically and shows it in the error block as **"Abrir link novo de autenticação no Supermetrics"**.

### Vercel deployment requirement
This project uses API routes (for example `/api/integrations/supermetrics/accounts`), so the deployment must run as a Next.js server build.
In Vercel Project Settings, keep Output Directory as default/`.next` (not `public` static output).

## Notes
This V1 ships with realistic mock data and fake adapters prepared for future production integrations (Meta, Google, TikTok, LinkedIn, Supermetrics).
