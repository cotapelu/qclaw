# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

We actively support the latest 1.0.x release. Security patches will be issued as needed.

---

## Reporting a Vulnerability

We take the security of @mariozechner/pi-tui-professional seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

### **Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please email the security team at:

** security@qclaw.dev **

### What to Include

When reporting a vulnerability, please provide:

1. **Description**: Clear description of the vulnerability
2. **Impact**: What could an attacker do?
3. **Steps to reproduce**: Detailed steps to replicate the issue
4. **Version**: Which version(s) are affected?
5. **Proof of concept**: Code or commands that demonstrate the issue (if possible)
6. **Mitigation**: Any known workarounds

### Response Timeline

We aim to respond within **48 hours** and will:

1. Acknowledge receipt within 48 hours
2. Investigate and confirm the issue
3. Provide an ETA for a fix within 7 days
4. Release a patch as soon as possible (typically within 14 days for severe issues)
5. Credit you in the security advisory (if desired)

---

## Security Best Practices for Users

1. **Keep dependencies updated**: Always use the latest supported version of pi-tui and pi-coding-agent
2. **Validate input**: When using this library in your application, validate and sanitize any user input before processing
3. **Run with least privilege**: If your TUI application requires special permissions, run with minimal necessary access
4. **Audit dependencies**: Regularly run `npm audit` and update transitive dependencies
5. **Secure terminal environment**: Be aware of terminal multi-user environments; this library does not encrypt data in memory

---

## Known Security Considerations

### 1. Terminal-based Applications

TUI applications run in terminals which may have security implications:
- Terminals may be shared or logged
- Input may be captured by other processes
- Terminal emulators may have vulnerabilities

**Mitigation**: Use trusted terminals, avoid handling sensitive data if possible, clear sensitive data from memory when done.

### 2. Child Process Execution

This library may execute child processes (e.g., tool execution components). Those processes run with the same privileges as the TUI application.

**Mitigation**: Validate and sanitize commands before execution; avoid running as root; use absolute paths.

### 3. Theme and Color Codes

Theme system uses color codes that are rendered in the terminal. Maliciously crafted theme files could potentially exploit terminal emulator vulnerabilities.

**Mitigation**: Only use themes from trusted sources; validate theme JSON if loading external files.

### 4. Denial of Service

Large inputs or deeply nested message histories could cause performance degradation.

**Mitigation**: Use `ChatContainer`'s `maxMessages` property to limit history; validate input sizes.

---

## Security Update Policy

- Security patches will be released as `patch` version bumps (e.g., 1.0.0 → 1.0.1)
- Critical vulnerabilities may trigger an immediate release outside the normal schedule
- GitHub Security Advisories will be used for disclosed vulnerabilities
- CVSS scores will be assigned to vulnerabilities when applicable

---

## Third-party Dependencies

We monitor dependencies for security vulnerabilities using:

- `npm audit` in CI
- GitHub Dependabot (to be enabled)
- Manual periodic reviews

If a vulnerability is found in a dependency:

1. Assess impact
2. Update to patched version if available
3. If no patch exists, evaluate workarounds or alternative dependencies
4. Issue a security release if necessary

---

## Incident Response

If a security incident occurs:

1. **Contain**: Identify and isolate affected versions
2. **Assess**: Determine severity and impact
3. **Remediate**: Fix the vulnerability, prepare patch
4. **Disclose**: Coordinate with affected users, publish security advisory
5. **Prevent**: Improve processes to prevent recurrence

---

## Bug Bounty / Rewards

Currently, we do not have a formal bug bounty program. However, we will publicly acknowledge security researchers who responsibly disclose vulnerabilities (unless they wish to remain anonymous).

---

## Contact

**Security Email**: security@qclaw.dev  
**PGP Key**: Available upon request for encrypted communications

**Do NOT use** the public GitHub issue tracker for security vulnerabilities.

---

*Last updated: 2026-04-23*  
*For: @mariozechner/pi-tui-professional*
