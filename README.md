# APEX Support

Public support and legal website for **APEX - Race Tracker**.

Public domain: **https://apexracetracker.com** (GitHub Pages).

Pages:
- Privacy Policy: `/privacy/`
- Terms of Use: `/terms/`
- Support: `/support/`

Support email: **apex.race.tracker@gmail.com**

This repository contains only public website/legal content and is separate from the private APEX application source code.

## Keeping the app and website policies consistent

The app's `mobile/src/content/legal.ts` is the authoritative legal content. After updating it, generate the public pages and the compatibility data script with Node.js:

```sh
node scripts/sync-legal.mjs /path/to/mobile/src/content/legal.ts
node scripts/sync-legal.mjs /path/to/mobile/src/content/legal.ts --check
```

This uses only Node built-ins. It updates `privacy/index.html`, `terms/index.html` and `legal.js` together. Full policy text is present in the HTML and works without JavaScript. `legal.js` remains available for previously cached page shells. Review and commit the generated files to `main` to publish through the existing GitHub Pages setup; preserve `CNAME` and `.nojekyll`.

The October 18, 2026 policy describes optional notifications, actual service-provider roles, feedback delivery, remote thumbnails and website hosting. No advertising or analytics scripts are added to this website.

Before App Store submission, confirm the legal operator, provider processing countries and agreements, operational retention and privacy-request procedures, and the App Privacy answers for the selected app build. The legal text is not a legal-compliance certification.
