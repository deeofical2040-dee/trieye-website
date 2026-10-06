# TRIEYE Website — Automatic Git Workflow & Production Rules

For ALL tasks on the TRIEYE website project:

## Repository Info
- **Project Directory:** `/Users/apple/Documents/Trieye`
- **Remote:** `https://github.com/deeofical2040-dee/trieye-website.git`
- **Branch:** `main`

---

## Automatic Git Workflow
After completing ANY requested website changes:

1. **Implement & Verify**: Complete the requested changes and test/verify correctness.
2. **Check Git Status**: Inspect `git status`.
3. **Exclude Temporary/Test Files**:
   - Never stage `scratch/`, test scripts, temporary screenshots, debug files, or generated test artifacts.
   - Ensure `scratch/` is always ignored.
4. **Stage Production Files**: `git add -A` (verify staged files and unstage any non-production artifacts).
5. **Commit**: Create a meaningful, descriptive commit message based on the work done (e.g., `"Improve Studio Gallery carousel"`, `"Fix mobile responsive layout"`, `"Update TRIEYE website features and UI"`). Never use `"update"`, `"changes"`, etc.
6. **Sync & Rebase**: Run `git pull --rebase origin main` before pushing. If conflicts occur, STOP immediately and show conflicting files. Never force-resolve blindly.
7. **Push**: Run `git push origin main`.
8. **Show Summary**: Output the standard success message format:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TRIEYE — GITHUB UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: <Task Description>
Branch: main
Commit: <short commit hash>
Status: Successfully pushed to GitHub
Scratch/Test files: Not included

🚀 Latest changes are now on origin/main.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Also list the modified production files.

---

## Safety & Security Rules
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
