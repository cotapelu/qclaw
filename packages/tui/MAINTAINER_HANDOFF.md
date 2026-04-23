# Maintainer Handoff Guide

## @mariozechner/pi-tui-professional v1.0.0

This document consolidates everything a maintainer needs to know to manage this package.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Package Overview](#package-overview)
3. [Before Publish](#before-publish)
4. [Publishing](#publishing)
5. [After Publish](#after-publish)
6. [Ongoing Maintenance](#ongoing-maintenance)
7. [Important Files](#important-files)
8. [Support & Contacts](#support--contacts)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Build | `npm run build` |
| Test | `npm test` |
| Test all (including sanity) | `npm run test:all` |
| Clean | `npm run clean` |
| Type check | `npm run type-check` |
| Dry-run publish | `npm pack --dry-run` |
| Publish (once ready) | `npm publish --access public` |

**Prepack hook**: `npm run build && npm test && npm pack --dry-run` (auto-runs on `npm publish`)

---

## Package Overview

- **Name**: `@mariozechner/pi-tui-professional`
- **Version**: 1.0.0 (see VERSION file)
- **License**: Apache-2.0
- **Type**: ESM (`type: module`)
- **Main**: `dist/index.js`
- **Types**: `dist/index.d.ts`
- **Size**: ~30 KB gzipped
- **Status**: Production Ready ✅

**Purpose**: Professional TUI component library for AI coding assistants, built by composing pi-tui and pi-coding-agent.

**Peer Dependencies** (must be installed by consumers):
- `@mariozechner/pi-tui` ^0.68.0
- `@mariozechner/pi-coding-agent` ^0.68.0

**Dependencies** (also listed for development):
- Same as peers (both peer and dep to ensure availability)

---

## Before Publish

### 1. Verify npm access
```bash
npm whoami
# If not logged in: npm login
```
Ensure you have publish rights to `@mariozechner` scope.

### 2. Final validation
```bash
npm run clean
npm run build
npm test
npm run type-check
npm pack --dry-run
```
All must succeed. Fix any errors.

### 3. Check package contents
`npm pack --dry-run` should list:
- `dist/` (compiled JS + .d.ts + .map)
- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `QUICKSTART.md`
- Additional docs (see IMPORTANT_FILES)

**Do NOT** see `src/`, `tests/`, `examples/`, `.github/`.

### 4. Confirm version
Check `VERSION` file and `package.json` match. Update if needed.

---

## Publishing

**IMPORTANT**: This step cannot be undone easily after 72 hours. Double-check everything.

```bash
cd packages/tui
npm publish --access public
```

- Enter 2FA code if prompted (use TOTP or npm 2FA)
- Wait for upload to complete (~few seconds)
- You should see: `+ @mariozechner/pi-tui-professional@1.0.0`

### If prepack fails
- Do NOT force publish
- Fix the failing step (build/test)
- Commit and retry

### If permission denied
- Verify you own the scope: `npm access ls-packages @mariozechner`
- Request access: `npm access grant read-write @mariozechner <your-username>`

---

## After Publish

### 1. Verify on npmjs.com
Visit: https://npmjs.com/package/@mariozechner/pi-tui-professional
- Version is correct
- Files tab shows dist/, README, LICENSE
- Install test passes in fresh project

### 2. Test install
```bash
mkdir ~/verify-publish && cd ~/verify-publish
npm init -y
npm install @mariozechner/pi-tui-professional
npx tsx -e "import { ThemeManager } from '@mariozechner/pi-tui-professional'; console.log(ThemeManager.getInstance().initialize('dark'))"
```
Should complete without errors.

### 3. Git tag and push
```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 4. Create GitHub release
- Go to https://github.com/qcoder/qclaw/releases
- Draft new release
- Tag: `v1.0.0`
- Title: v1.0.0
- Description: Copy CHANGELOG.md v1.0.0 section
- Publish

### 5. Announce (optional)
- Notify team/users
- Update dependent projects
- Post on relevant channels

---

## Ongoing Maintenance

### Versioning
Follow Semantic Versioning (semver):
- **Patch** (1.0.0 → 1.0.1): bug fixes
- **Minor** (1.0.0 → 1.1.0): new features, backward compatible
- **Major** (1.0.0 → 2.0.0): breaking changes

When releasing:
```bash
npm version patch|minor|major
git push && git push --tags
npm publish
```

### Monitoring
- **npm downloads**: https://npmjs.com/package/@mariozechner/pi-tui-professional?activeTab=downloads
- **GitHub issues**: Check daily, label, triage
- **Security alerts**: Enable GitHub Dependabot (already configured)
- **CI status**: Ensure GitHub Actions stay green

### Dependency Updates
- Monitor pi-tui and pi-coding-agent releases
- Test against new patch/minor versions
- Update peer dependency ranges if needed (bump version to publish)
- Use Dependabot for automated PRs (already enabled)

### Security
- Read security reports promptly (security@qclaw.dev)
- Patch vulnerabilities quickly; release patch version
- Update SECURITY.md if policy changes

---

## Important Files

### Core Docs
- **README.md** – Main API reference, FAQ
- **CHANGELOG.md** – Version history
- **DEPLOYMENT.md** – Full deployment guide
- **PRODUCTION_READINESS.md** – Readiness validation
- **TROUBLESHOOTING.md** – Common issues
- **COMPATIBILITY.md** – Supported environments

### Handoff & Reference
- **INDEX.md** – Central navigation for all docs
- **MAINTAINER_HANDOFF.md** – You are here
- **FINAL_PREPUBLISH_CHECKLIST.md** – Pre-publish checklist
- **QUICK_COMMANDS.txt** – Command reference

### Development
- **CONTRIBUTING.md** – Contribution guidelines
- **CODE_OF_CONDUCT.md** – Community standards
- **ROADMAP.md** – Future plans (v1.1, v1.2, v2.0)
- **OPTIONAL_IMPROVEMENTS.md** – Candidate features

### Governance
- **SECURITY.md** – Vulnerability reporting
- .github/ISSUE_TEMPLATE/ – Issue templates
- .github/PULL_REQUEST_TEMPLATE.md – PR template
- .github/dependabot.yml – Automated dependency updates
- .github/workflows/ci.yml – CI configuration

---

## Common Tasks

### Add a new component
1. Add source file in `src/components/...`
2. Export from appropriate `index.ts`
3. Add tests in `tests/`
4. Update README with documentation
5. Run `npm test` and `npm run build`
6. Commit and PR

### Bump version
```bash
npm version patch  # or minor/major
git push && git push --tags
```
Then publish: `npm publish`

### Respond to a bug report
1. Reproduce locally (ask reporter for steps if needed)
2. Fix the issue
3. Add regression test
4. Bump version (patch if bug fix)
5. Release

### Add a feature
1. Discuss in issue or PR (FEEDBACK!)
2. Implement following existing patterns
3. Write tests
4. Update docs (README, possibly CHANGELOG)
5. Ensure backward compatibility or document breaking changes
6. Release as minor (or major if breaking)

---

## Emergency Procedures

### Security vulnerability
1. **Do NOT** disclose publicly until patch ready
2. Email details to security@qclaw.dev
3. Fix the issue in a private branch
4. Prepare patch and release as patch version
5. Coordinate disclosure timeline with team
6. Publish to npm and GitHub
7. Draft GitHub Security Advisory
8. Notify users

### Broken publish (within 72h)
If you published a broken version:
```bash
npm unpublish @mariozechner/pi-tui-professional@<version>
# Fix issues, then republish
```
Note: Unpublishing is disruptive; only do if critical.

### Broken publish (after 72h)
Cannot unpublish. Instead:
```bash
npm deprecate @mariozechner/pi-tui-professional@<version> "Critical bug. Upgrade to <fixed>."
npm version patch
npm publish
```
Then notify users to upgrade.

---

## Contacts

- **Repo**: https://github.com/qcoder/qclaw
- **Issues**: https://github.com/qcoder/qclaw/issues
- **Security**: security@qclaw.dev
- **npm**: https://npmjs.com/package/@mariozechner/pi-tui-professional

---

## Quick Publish Reminder

**NEVER publish without**:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (all 18 tests)
- [ ] `npm pack --dry-run` shows correct files
- [ ] Version updated in `package.json` and `VERSION`
- [ ] `CHANGELOG.md` updated with new version
- [ ] You are logged in to npm (`npm whoami`)
- [ ] 2FA ready (if enabled)
- [ ] All docs committed
- [ ] Git working tree clean

**NEVER**:
- Do not force-publish over existing version
- Do not publish if tests fail
- Do not publish if you don't have rights

---

## Final Checklist Before Hitting Publish

- [ ] Clean build: `npm run clean && npm run build`
- [ ] All tests pass: `npm test` → ✨ All tests passed!
- [ ] Type check passes: `npm run type-check`
- [ ] Dry-run pack looks good: `npm pack --dry-run`
- [ ] Version numbers consistent (package.json, VERSION)
- [ ] CHANGELOG.md includes entry for this version
- [ ] README.md up-to-date (no broken links)
- [ ] No sensitive data in code (secrets, credentials)
- [ ] All important files are listed in `package.json` `files` array
- [ ] `.npmignore` excludes src/, tests/, examples/, .github/ (except workflows)
- [ ] You are on correct git branch (main/master)
- [ ] You have push rights to origin
- [ ] You have npm publish rights
- [ ] 2FA device ready

---

**You are now ready to maintain @mariozechner/pi-tui-professional! 🎉**

---

*Last updated: 2026-04-23*  
*For maintainers of v1.0.0 and beyond*
