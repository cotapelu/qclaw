# Release Checklist for @mariozechner/pi-tui-professional

Before publishing, verify the following:

## ✅ Pre-flight Checks

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Type check: `npm run type-check` (optional, may have external errors)
- [ ] Lint passes (if configured): `npm run lint`
- [ ] Package size reasonable (< 100 KB): `npm pack --dry-run | grep "package size:"`
- [ ] LICENSE file present and correct
- [ ] README.md up to date
- [ ] version in package.json is correct (not 0.0.0)
- [ ] git status clean (no uncommitted changes)

## 📦 Package Contents

Verify `npm pack --dry-run` shows:
- `dist/` (compiled JS + types)
- `README.md`
- `LICENSE`
- `package.json`

Should **NOT** include:
- `src/`
- `tests/`
- `examples/`
- `.git/`
- `node_modules/`

## 🔐 Security

- [ ] No hardcoded secrets
- [ ] No unsafe `eval()` or `child_process` (unless absolutely needed)
- [ ] All inputs validated (if any)
- [ ] Dependencies scanned (if applicable)

## 📝 Documentation

- [ ] README has:
  - [ ] Installation instructions
  - [ ] Quick start example
  - [ ] API reference for all exported components
  - [ ] Links to examples
- [ ] CHANGELOG.md (optional but recommended)
- [ ] QUICKSTART.md (optional but helpful)

## 🧪 Tests Coverage

Current test suite:
- Unit tests: `tests/run.test.ts` ✅
- Comprehensive: `tests/comprehensive.test.ts` ✅
- Integration: `tests/integration.test.ts` ✅
- Type tests: `tests/types.test-d.ts` (optional)

## 🚀 Publishing

```bash
# Dry run first (already done above)
npm pack --dry-run

# Publish to npm (requires npm account and 2FA)
npm publish --access public
```

If you need to unpublish a version within 72 hours:
```bash
npm unpublish @mariozechner/pi-tui-professional@<version>
```

## 📊 After Publishing

- [ ] Verify package on npm: https://www.npmjs.com/package/@mariozechner/pi-tui-professional
- [ ] Update dependent projects
- [ ] Create GitHub release with changelog
- [ ] Announce to users

## 🆘 Troubleshooting

**"You do not have permission to publish"**
- Make sure you're logged in: `npm whoami`
- Use `npm login` if needed
- Check package name ownership

**"Package name already exists"**
- Either use a different name, or
- If you own it, use `npm access grant read-write <team>` for scoped packages

**Build fails after publish**
- Ensure `dist/` is included in `files` array in package.json
- Ensure compiled files exist before running `npm publish`

## Notes

- Current package size: ~30 KB gzipped
-license: Apache-2.0
- peer dependencies: pi-tui, pi-coding-agent
- Test command: `npm test`
- Build command: `npm run build`

Last validated: 2026-04-23
