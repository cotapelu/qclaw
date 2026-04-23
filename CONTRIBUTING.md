# Contributing to qclaw

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## How to Contribute

### Reporting Bugs

- Check existing issues before creating a new one
- Include steps to reproduce, expected behavior, actual behavior
- Add relevant logs and system information

### Suggesting Features

- Open an issue first to discuss the feature
- Explain the use case and why it would be valuable
- Consider if it fits the project's scope

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Make changes and add tests
4. Ensure `npm test` passes
5. Commit with clear messages (conventional commits)
6. Push to your fork
7. Open a Pull Request (PR)

## Development Setup

```bash
git clone https://github.com/your-username/qclaw.git
cd qclaw
npm install
npm run build
npm start
```

## Running Tests

```bash
npm test
```

## Code Style

- Follow TypeScript best practices
- Use existing patterns in the codebase
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[body]

[footer]
```

Types: feat, fix, docs, style, refactor, perf, test, chore

Example:
```
feat(commands): add /grep command for codebase search

Implements a simple grep-like search that scans files for patterns.

Closes #123
```

## Release Process

- Releases are automated via semantic-release
- All PRs must pass CI checks
- Version bumps follow semver

## Code of Conduct

Please read and adhere to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

- Open an issue
- Join our discussions

---

Happy contributing! 🚀
