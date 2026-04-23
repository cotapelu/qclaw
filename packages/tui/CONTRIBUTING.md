# Contributing to @mariozechner/pi-tui-professional

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

1. **Fork the repository** and create a feature branch
2. **Install dependencies**: `npm install`
3. **Build**: `npm run build`
4. **Run tests**: `npm test`
5. **Make changes** following the guidelines below
6. **Submit a pull request** with a clear description

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow existing code style (see `.prettierrc`)
- Add JSDoc comments for all public APIs
- Keep components small and focused (single responsibility)
- Use composition over inheritance

### Component Design

When creating new components:

1. Extend `Container` from pi-tui when needed
2. Implement proper `render(width)` returning `string[]`
3. Implement `invalidate()` to clear render cache
4. Use `ThemeManager` for colors, never hardcode ANSI
5. Respect line width - every line ≤ given width
6. Propagate focus to children if implementing `Focusable`
7. Cache render output to improve performance

### Testing

- Add unit tests for new components in `tests/`
- Use `tsx` for runtime tests
- Keep tests simple and focused
- Aim for >90% coverage

### Documentation

- Update README.md when adding new public APIs
- Add examples for new components
- Keep docs in sync with code changes
- Use clear, concise language

## Scripts

```bash
npm run build        # Compile TypeScript
npm test             # Run all tests
npm run test:unit    # Unit tests only
npm run type-check   # TypeScript type checking
npm run clean        # Remove dist/
```

## CI/CD

Pull requests are automatically checked by GitHub Actions:
- Build verification
- All test suites
- Package size check (< 50 KB)
- Type checking

## Release Process

1. Ensure all tests pass and CI is green
2. Update CHANGELOG.md with new version changes
3. Bump version in package.json (semver)
4. Commit and tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
5. Push tag: `git push origin --tags`
6. `npm publish` (with 2FA)
7. Create GitHub release with changelog

## Package Structure

```
packages/tui/
├── src/
│   ├── index.ts              # Main exports
│   ├── theme/                # ThemeManager
│   ├── components/           # All components
│   └── utils/                # Utilities
├── tests/                    # Test suites
├── examples/                 # Example apps
├── benchmarks/               # Performance tests
├── dist/                     # Compiled output (generated)
└── package.json
```

## Dependencies

**Peer dependencies** (must be installed by consumer):
- `@mariozechner/pi-tui`
- `@mariozechner/pi-coding-agent`

**Dev dependencies** (for building):
- `typescript`
- `tsx`
- `@types/node`

Do not add new runtime dependencies without discussion.

## Questions?

Open an issue: https://github.com/qcoder/qclaw/issues

## License

Apache-2.0 - see LICENSE file
