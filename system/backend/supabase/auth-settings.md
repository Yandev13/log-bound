# Auth settings

This document gives the Supabase Auth settings of each project. The rebuild procedure (runbook, procedure B, step 7) uses it. After a change to the Auth settings, update this document (backend rule 11).

`supabase/config.toml` holds the same values. To apply them to a hosted project, run `supabase config push --project-ref <ref>` after `supabase login`.

## 1. Target settings

| Setting | Value | Requirement |
|---|---|---|
| JWT expiry | 900 seconds | QR-SE-03, D-22 |
| Refresh token rotation | On | QR-SE-03 |
| Refresh token reuse interval | 10 seconds | QR-SE-03 (reuse after the interval revokes the session) |
| Public sign-up (`[auth] enable_signup`) | Off | FR-ADM-01, network document section 5 |
| Email provider (`[auth.email] enable_signup`) | On | FR-AUTH-01. CAUTION: On a hosted project this value turns email login on or off. Do not set it to false. |
| Anonymous sign-in | Off | QR-SE-01 |
| Minimum password length | 8 | QR-SE-04 |
| Email confirmation | Off (the admin makes accounts) | FR-AUTH-07 |
| Sign-in rate limit | 30 for each 5 minutes for each IP address | QR-SE-08 |
| Site URL and redirect URLs | Admin web domain and app schemes only | Network document, section 5. Set when the web host exists. |

## 2. Status of each project

| Project | Ref | Status |
|---|---|---|
| `ojt-dtr-dev` | `bclcgckflztfyxqaqvqt` | Applied on 2026-10-25 with `supabase config push`. `supabase config push` (dry run, answer "n") shows no difference. |
| `ojt-dtr-prod` | Not created (D-40) | |
