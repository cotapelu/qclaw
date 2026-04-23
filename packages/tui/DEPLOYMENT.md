# Deployment Guide

This guide covers the complete deployment process for `@mariozechner/pi-tui-professional`.

## Table of Contents

1. [Pre-Publish Checklist](#pre-publish)
2. [Publish to npm](#publish)
3. [Post-Publish Steps](#post-publish)
4. [Verification](#verification)
5. [Rollback](#rollback)
6. [Maintenance](#maintenance)

---

## Pre-Publish <a name="pre-publish"></a>

### Automated Checks (prepack hook)

The `prepack` script automatically runs:

```bash
npm run build   # Compile TypeScript
npm test        # Run all test suites
npm pack --dry-run  # Validate package contents
```

All must succeed before manual publish.

### Manual Verification

1. **Build**:
   ```bash
   npm run build
   ```
   - No TypeScript errors
   - `dist/` directory created with .js, .d.ts, .map files

2. **Tests**:
   ```bash
   npm test
   ```
   - Unit tests: 5/5 pass
   - Comprehensive: 11/11 pass
   - Integration: 1/1 pass
   - Total: 17/17 pass

3. **Package Contents**:
   ```bash
   npm pack --dry-run
   ```
   Check output includes:
   - `dist/index.js`
   - `dist/index.d.ts`
   - `README.md`
   - `LICENSE`
   - `CHANGELOG.md`
   - `QUICKSTART.md`

   And excludes:
   - `src/`
   - `tests/`
   - `examples/`
   - `.git/`
   - `node_modules/`

4. **Package Size**:
   - Should be < 50 KB (target: ~30 KB)
   - Verify with `npm pack --dry-run` output

5. **Peer Dependencies**:
   - Ensure `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent` are listed as `peerDependencies`
   - These must be installed by consumers

6. **Documentation**:
   - README.md has correct installation instructions
   - CHANGELOG.md updated with v1.0.0
   - All examples run without errors

---

## Publish to npm <a name="publish"></a>

### Requirements

- npm account with 2FA enabled
- Ownership of scope `@mariozechner` (or appropriate scope)
- Valid email (verified)
- `npm login` completed

### Steps

1. **Login** (if not already):
   ```bash
   npm login
   ```
   Enter username, password, and 2FA code if prompted.

2. **Dry-run (optional)**:
   ```bash
   npm pack --dry-run
   ```
   Review files to be included.

3. **Publish**:
   ```bash
   npm publish --access public
   ```

   - `--access public` is required for scoped packages
   - npm will run `prepack` automatically (build + test + dry-run)
   - If prepack fails, publish is aborted

4. **Enter 2FA** (if enabled):
   - Check your authenticator app
   - Enter the 6-digit code when prompted

### Expected Output

```
+ @mariozechner/pi-tui-professional@1.0.0
```

### Troubleshooting

| Error | Solution |
|-------|----------|
| `You do not have permission to publish` | Ensure you're logged in (`npm whoami`). Verify you own the scope. |
| `Package name already exists` | The package already exists. Use `npm version` to bump and publish new version, or verify ownership. |
| `prepack script failed` | Fix build or test errors locally before retrying. |
| `Network error` | Check internet connection, npm registry access. |

---

## Post-Publish <a name="post-publish"></a>

### 1. Verify Publication

Visit: https://npmjs.com/package/@mariozechner/pi-tui-professional

Check:
- Version: 1.0.0
- Last updated: recent date
- Files: dist/, README.md, LICENSE present
- No install warnings

### 2. Install and Test

Create a temporary project to verify:

```bash
mkdir test-install && cd test-install
npm init -y
npm install @mariozechner/pi-tui-professional
```

Write a simple test script:

```typescript
import { ThemeManager } from "@mariozechner/pi-tui-professional";
const theme = ThemeManager.getInstance();
theme.initialize("dark");
console.log("Theme initialized:", theme.getMode());
```

Run: `npx tsx test.ts`

### 3. Create Git Tag

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 4. Create GitHub Release

1. Go to: https://github.com/qcoder/qclaw/releases
2. Click "Draft a new release"
3. Tag: `v1.0.0` (must match git tag)
4. Title: "v1.0.0"
5. Copy CHANGELOG.md content for "Full Changelog"
6. Click "Publish release"

### 5. Add Badges to README (optional)

After npm publish, you can add badges:

```markdown
[![npm version](https://img.shields.io/npm/v/@mariozechner/pi-tui-professional.svg)](https://npmjs.com/package/@mariozechner/pi-tui-professional)
[![npm downloads](https://img.shields.io/npm/dm/@mariozechner/pi-tui-professional.svg)](https://npmjs.com/package/@mariozechner/pi-tui-professional)
[![License](https://img.shields.io/npm/l/@mariozechner/pi-tui-professional.svg)](LICENSE)
[![Build Status](https://github.com/qcoder/qclaw/actions/workflows/ci.yml/badge.svg)](https://github.com/qcoder/qclaw/actions/workflows/ci.yml)
```

### 6. Announce

- Share with team/users
- Update dependent projects to use v1.0.0
- Post in relevant communities (if applicable)

---

## Verification <a name="verification"></a>

### Automated

Run the `prepack` script manually to ensure it still passes:

```bash
npm run prepack
```

### Manual Checklist

- [ ] Package available on npm
- [ ] `npm install` works in fresh project
- [ ] TypeScript types accessible
- [ ] Examples run without errors
- [ ] GitHub release created with changelog
- [ ] Git tag pushed
- [ ] Documentation updated (if needed)
- [ ] CI green on main branch

---

## Rollback <a name="rollback"></a>

### Within 72 Hours

npm allows unpublishing a version within 72 hours:

```bash
npm unpublish @mariozechner/pi-tui-professional@1.0.0
```

**Warning**: This is disruptive. Any projects that already installed will have broken dependencies.

### After 72 Hours

Cannot unpublish. Use deprecation instead:

```bash
npm deprecate @mariozechner/pi-tui-professional@1.0.0 "This version has a critical bug. Please upgrade to v1.0.1."
```

Then publish a fixed version (e.g., v1.0.1).

---

## Maintenance <a name="maintenance"></a>

### Regular Tasks

1. **Monitor Issues**: Check GitHub issues regularly
2. **Update Dependencies**: Keep pi-tui, pi-coding-agent up to date
3. **CI Maintenance**: Ensure GitHub Actions workflows stay current
4. **Security Audits**: Run `npm audit` periodically
5. **Performance**: Monitor package size, avoid bloat

### Versioning

Follow [SemVer](https://semver.org/):

- **1.0.0** - Initial stable release
- **1.0.1** - Bug fixes, no new features
- **1.1.0** - New features, backward compatible
- **2.0.0** - Breaking changes

### Publishing New Versions

1. Update CHANGELOG.md
2. Bump version in package.json
3. Commit: `git commit -am "Bump to v1.0.1"`
4. Tag: `git tag -a v1.0.1 -m "Release v1.0.1"`
5. Push: `git push && git push --tags`
6. `npm publish` (prepack runs automatically)

---

## Emergency Contacts

- **Issues**: https://github.com/qcoder/qclaw/issues
- **npm Support**: https://www.npmjs.com/support
- **Package Page**: https://npmjs.com/package/@mariozechner/pi-tui-professional

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript |
| `npm test` | Run all tests |
| `npm pack --dry-run` | Validate package contents |
| `npm publish` | Publish to npm (runs prepack) |
| `npm version patch` | Bump patch version (1.0.0 → 1.0.1) |
| `npm version minor` | Bump minor version (1.0.0 → 1.1.0) |
| `npm version major` | Bump major version (1.0.0 → 2.0.0) |
| `npm deprecate` | Deprecate a version |
| `npm dist-tag add <version> latest` | Set default install version |

---

**Good luck with the deployment! 🚀**

---

*Last updated: 2026-04-23*  
*For: @mariozechner/pi-tui-professional v1.0.0*
