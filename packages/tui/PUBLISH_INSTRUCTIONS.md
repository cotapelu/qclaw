# Publishing Instructions

This package is ready for publication to npm.

## Pre-Publish Checklist

- [x] All tests pass (`npm test`)
- [x] Build successful (`npm run build`)
- [x] Type check clean (`npm run type-check`)
- [x] Package size acceptable (< 50 KB): 30.4 KB
- [x] LICENSE in place (Apache-2.0)
- [x] README.md up to date
- [x] CHANGELOG.md updated
- [x] .npmignore configured
- [x] Peer dependencies correct
- [x] CI/CD workflow configured
- [x] Repository field in package.json
- [x] Keywords optimized

## Publication Steps

1. **Login to npm** (if not already):
   ```bash
   npm login
   ```
   - Username: your npm username
   - Password: your npm password (or 2FA code if enabled)
   - Email: verified email

2. **Dry run** (optional):
   ```bash
   npm pack --dry-run
   ```
   This shows what files will be included.

3. **Publish**:
   ```bash
   npm publish --access public
   ```

   Note: `--access public` is required for scoped packages (`@mariozechner/...`).

4. **Verify**:
   Visit: https://www.npmjs.com/package/@mariozechner/pi-tui-professional
   - Check version: 1.0.0
   - Check files: dist/, README.md, LICENSE present
   - Check tgz size matches (~30 KB)

## Post-Publication

1. **Git tag**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **GitHub Release**:
   - Go to https://github.com/qcoder/qclaw/releases
   - Create new release "v1.0.0"
   - Copy CHANGELOG.md content
   - Attach compiled package (optional)

3. **Update documentation**:
   - If you have a main project README, add badge:
     `[![npm](https://img.shields.io/npm/v/@mariozechner/pi-tui-professional.svg)](https://npmjs.com/package/@mariozechner/pi-tui-professional)`

4. **Announce**:
   - Share with team/users
   - Update dependent projects to use the published package

## Unpublishing (if needed within 72h)

```bash
npm unpublish @mariozechner/pi-tui-professional@1.0.0
```

After 72 hours, you cannot unpublish. Use `npm deprecate` instead to mark as deprecated.

## Troubleshooting

**"You do not have permission to publish"**
- Ensure you're logged in: `npm whoami`
- For scoped packages, you must own the scope `@mariozechner`
- Use `npm access grant read-write @mariozechner` if part of a team

**"Package name already exists"**
- The package name is taken. Either:
  - Use a different name
  - If you own it, proceed
  - If it's a transfer, contact npm support

**Build fails on publish**
- Ensure `dist/` exists and contains compiled files
- `npm run build` must succeed
- Check `files` array in package.json includes dist/

**Tests fail**
- Run `npm test` locally to fix issues first
- CI might have different environment - ensure all Node versions pass

## Versioning

We follow [SemVer](https://semver.org/):

- **1.0.0** - Initial stable release
- **1.0.1** - Bug fixes, no new features
- **1.1.0** - New features, backward compatible
- **2.0.0** - Breaking changes

## Support

- Issues: https://github.com/qcoder/qclaw/issues
- Documentation: See README.md
- Source: /home/quangtynu/Qcoder/qclaw/packages/tui

---

**Good luck with the publish! 🚀**
