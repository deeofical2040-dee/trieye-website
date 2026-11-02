# TRIEYE Website — Automatic Git & Vercel Production Workflow

For ALL tasks on the TRIEYE website project:

## Repository & Deployment Info
- **Project Directory:** `/Users/apple/Documents/Trieye`
- **Remote:** `https://github.com/deeofical2040-dee/trieye-website.git`
- **Production Branch:** `main`
- **Vercel Website:** `https://trieye-website.vercel.app`

---

## Automatic Git Push & Vercel Deployment Workflow
After completing ANY requested website changes:

1. **Implement & Build**:
   - Complete requested changes with precision.
   - Run `npm run build` to synchronize assets and distribution files.

2. **Run Tests & Verify**:
   - Run relevant test suites (`npm test` and any task-specific tests).
   - **Enforcement**: If tests or build fail, **DO NOT PUSH**. Fix the issue and retry until 100% passing.

3. **Check Git Status & Exclude Temporary/Test Files**:
   - Inspect `git status`.
   - **NEVER** stage `scratch/`, test scripts, temporary screenshots, debug files, or generated test artifacts.
   - Ensure `scratch/` is always ignored.

4. **Stage Production Files**:
   - `git add -A` (verify staged files and unstage any non-production artifacts).

5. **Commit**:
   - Create a meaningful, descriptive commit message based on the work done (e.g., `"Update TRIEYE Monthly Car Care Package workflow and dashboard redemption without QR"`, `"Add automated deployment verification script"`).
   - Never use `"update"`, `"changes"`, etc.

6. **Sync & Rebase**:
   - Run `git pull --rebase origin main` before pushing.
   - If conflicts occur, STOP immediately and show conflicting files. Never force-resolve blindly.

7. **Push to GitHub `main`**:
   - Run `git push origin main`.
   - GitHub `main` push triggers automatic Vercel production deployment.

8. **Verify Vercel Production Deployment**:
   - Run `node scripts/verify-deployment.js` (or `npm run verify-deploy`) to verify that the live production site (`https://trieye-website.vercel.app`) serves HTTP 200 and renders the updated changes.
   - **NEVER claim deployment succeeded unless verified.**

9. **Output Standard Summary Block**:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TRIEYE — GITHUB & VERCEL UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: <Task Description>
Branch: main
Commit: <short commit hash>
Git Status: Successfully pushed to GitHub
Build & Tests: PASSED (<details>)
Vercel Deployment: LIVE (HTTP 200 verified)
Live URL: https://trieye-website.vercel.app
Scratch/Test files: Not included

🚀 Latest changes are live in production.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Also list the modified production files.

---

## Safety & Security Rules
- **NEVER** overwrite or delete existing user changes.
- **NEVER** use `git push --force`, `git push --force-with-lease`, or `git reset --hard` without explicit user confirmation.
- **NEVER** push secrets, API secret keys, service_role keys, passwords, or personal access tokens.
- **NEVER** put credentials or tokens in code, URLs, or terminal logs.
- If manual auth is required, pause and instruct user: `"GitHub authentication required — please enter your credentials securely in the terminal."`
- **No changes case**: If no files were modified, do NOT create an empty commit. Show:
  ```text
  ✅ Task completed
  ℹ️ No file changes detected
  ℹ️ Git push not required
  ```
