# Fix invitation confirmation flow

## What will change
- Replace automatic token verification on page load with an intermediate “Activate Account & Set Password” action.
- Keep an auth-state listener active so sessions established automatically from a valid hash or PKCE callback go straight to the password form without a second exchange.
- Resolve `token_hash` links only after the user clicks the activation button, guarded against duplicate clicks and React remounts.
- Keep the password and confirmation validation, update the signed-in user’s password, clear auth parameters, show success feedback, and continue to the dashboard.
- Show “Link Expired” only for explicit Supabase invalid/expired-token errors; show retryable errors inline otherwise.
- Add safe diagnostic logging for parameter names/presence, auth event types, and Supabase errors without printing token values.
- Add a `/dashboard` entry that forwards authenticated dashboard traffic to the existing `/admin` dashboard.

## Technical details
- Refactor `ConfirmInvite` into landing, resolving, password, and expired states.
- Use `onAuthStateChange` plus `getSession`; do not call `exchangeCodeForSession`.
- Call `verifyOtp` for query-based `token_hash` links only from the activation click handler.
- Validate the finished flow with focused tests/build checks and a browser check of the initial non-consuming screen.
