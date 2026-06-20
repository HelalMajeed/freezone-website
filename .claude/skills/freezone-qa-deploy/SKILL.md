---
name: freezone-qa-deploy
description: Use this skill before committing, pushing, or deploying FreeZone changes. It verifies build, lint, routes, API compatibility, responsive UI, and production deployment risk.
allowed-tools: Read, Bash, Grep, Glob
---

# FreeZone QA Deploy

Before commit:
1. Show git diff summary.
2. Run available checks:
   - npm run lint --prefix freezone-web if available
   - npm run build --prefix freezone-web
   - npm run build --prefix freezone-api if available
   - API tests if available
3. Check for:
   - accidental env changes
   - secrets committed
   - broken imports
   - TypeScript errors
   - broken routes
   - broken Arabic/English switching
   - mobile responsive regressions
4. For UI:
   - verify desktop homepage
   - verify mobile homepage
   - verify catalog page
   - verify product page
   - verify dashboard page if touched
5. For backend:
   - verify API routes touched
   - verify Prisma changes are safe
   - verify no destructive migration without approval
6. Output:
   - pass/fail
   - exact commands run
   - remaining risks
   - commit message
   - whether it is safe to push main

Never push if build fails.
