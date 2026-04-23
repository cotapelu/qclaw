# 🚀 PUBLISH REMINDER

## @mariozechner/pi-tui-professional v1.0.0

**Before publishing, ensure ALL of these are checked:**

---

### ✅ Preflight Checklist

- [ ] Logged in to npm: `npm whoami` shows your account
- [ ] You have **publish access** to `@mariozechner` scope
- [ ] All code committed and pushed to `origin`
- [ ] `package.json` version is correct (1.0.0)
- [ ] `VERSION` file matches
- [ ] `CHANGELOG.md` has v1.0.0 entry
- [ ] Working directory is `packages/tui/`

---

### 🛠 Build & Test

```bash
npm run clean
npm run build   # Should succeed with no errors
npm test        # Should show ✨ All tests passed!
npm run type-check  # Optional, should be clean
```

---

### 📦 Package Check

```bash
npm pack --dry-run
```

Verify output includes:
- `dist/index.js`
- `dist/index.d.ts`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `QUICKSTART.md`

And **excludes**:
- `src/`
- `tests/`
- `examples/`

Package size should be **~30 KB**.

---

### 🎯 Publish Command

```bash
npm publish --access public
```

- You'll be prompted for **2FA code** if enabled (have your authenticator ready)
- Prepends `prepack` automatically (build + test + dry-run)
- If prepack fails, **do not retry** until you fix the error

Expected output:
```
+ @mariozechner/pi-tui-professional@1.0.0
```

---

### 📝 After Publish (MANDATORY)

1. **Verify on npm**: https://npmjs.com/package/@mariozechner/pi-tui-professional
   - Version 1.0.0 should be live
   - Files tab should show dist/, README, LICENSE

2. **Test install** in fresh project:
   ```bash
   mkdir test-install && cd test-install
   npm init -y
   npm install @mariozechner/pi-tui-professional
   npx tsx -e "import { ThemeManager } from '@mariozechner/pi-tui-professional'; console.log('OK')"
   ```

3. **Git tag & push**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

4. **Create GitHub release**:
   - Go to https://github.com/qcoder/qclaw/releases
   - Draft new release
   - Tag: `v1.0.0`
   - Copy CHANGELOG.md v1.0.0 section into description
   - Publish

5. **Announce** (optional):
   - Notify team/users
   - Update dependent projects to use v1.0.0

---

## 🚨 Emergency

### If you published a broken version (within 72h)
```bash
npm unpublish @mariozechner/pi-tui-professional@1.0.0
# Fix the issue, then republish
```

### If you published a broken version (after 72h)
```bash
npm deprecate @mariozechner/pi-tui-professional@1.0.0 "Critical bug. Upgrade to v1.0.1."
# Then fix, bump version, and publish new
```

---

## 📚 Where to Find Help

- **Full guide**: `DEPLOYMENT.md`
- **Maintainer handbook**: `MAINTAINER_HANDOFF.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Issues**: https://github.com/qcoder/qclaw/issues
- **Security**: security@qclaw.dev

---

**Good luck! 🎉 You've got this.**

*Keep this file handy during publish day.*
