# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.2.x | Yes |
| < 0.2 | Best-effort |

## Reporting a vulnerability

Do **not** open a public GitHub issue for security problems.

Email the maintainer via the address on the [GitHub profile](https://github.com/WilliamsLenkeu) with:

- a short description of the issue
- steps to reproduce
- impact assessment (auth bypass, data exposure, RCE, etc.)
- any proof-of-concept (kept private)

You should receive an acknowledgement within a few days. Please give reasonable time for a fix before any public disclosure.

## Scope notes

- Demo credentials in the README (`ada@devsync.dev` / seed password) are for **local seed data only**, never for production.
- Never commit `.env`, API tokens (`dsk_…`), Resend keys, or JWT secrets.
- Invitation tokens and freshly created API token secrets are shown once and must not be logged.
