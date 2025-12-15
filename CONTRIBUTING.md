# Contributing to Deal Shield

Thank you for your interest in contributing to Deal Shield! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/deal-shield.git
   cd deal-shield
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/deal-shield.git
   ```
4. **Install dependencies** (see README.md for detailed setup)

## 🌿 Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features (e.g., `feature/enhanced-pii-detection`)
- `fix/*` - Bug fixes (e.g., `fix/csv-parsing-edge-case`)
- `docs/*` - Documentation updates

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

## 💻 Development Workflow

### 1. Make Your Changes

- Follow existing code style and patterns
- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Add tests for new functionality (when applicable)

### 2. Code Style Guidelines

#### TypeScript/React
```typescript
// ✅ Good: Descriptive names, proper typing
interface AuditResult {
  score: number;
  verdict: VerdictColor;
  issues: Issue[];
}

function calculateScore(data: AuditData): number {
  // Clear logic with comments for complex operations
  return score;
}

// ❌ Bad: Generic names, missing types
function calc(d) {
  return d.x + d.y;
}
```

#### Component Structure
```tsx
// ✅ Good: Props interface, clear component structure
interface ButtonProps {
  variant?: "primary" | "secondary";
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant = "primary", onClick, children }: ButtonProps) {
  return (
    <button 
      className={cn("base-styles", variant === "primary" && "primary-styles")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

#### Styling
- Use Tailwind CSS utility classes
- Keep className strings organized with `cn()` helper
- Avoid inline styles
- Follow existing design patterns

```tsx
// ✅ Good: Tailwind utilities, responsive design
<div className={cn(
  "rounded-xl border border-border/70 p-6",
  "bg-card/50 backdrop-blur-xl",
  "transition hover:bg-card/60",
  "md:p-8 lg:p-10"
)}>

// ❌ Bad: Inline styles
<div style={{ padding: '24px', borderRadius: '12px' }}>
```

### 3. Testing

```bash
# Run linting
bun run lint

# Run smoke tests
bun run smoke

# Manual testing
bun run dev
```

Test your changes thoroughly:
- ✅ Test on different file types (CSV, PDF, TXT)
- ✅ Test edge cases (empty files, large files, corrupted data)
- ✅ Test UI responsiveness (mobile, tablet, desktop)
- ✅ Test error states and loading states
- ✅ Verify accessibility (keyboard navigation, screen readers)

### 4. Commit Your Changes

Write clear, descriptive commit messages following this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
# Good commit messages
git commit -m "feat(audit): add manufacturer field to bike parsing"
git commit -m "fix(scope-guard): prevent false positives in titanium detection"
git commit -m "docs(readme): add deployment instructions"

# With body
git commit -m "refactor(dashboard): optimize KPI calculations

- Memoize expensive computations
- Reduce re-renders with useMemo
- Improve performance for large datasets

Closes #42"
```

### 5. Keep Your Branch Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your branch on latest main
git rebase upstream/main

# Resolve any conflicts if they arise
```

### 6. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out the PR template with:
   - **Description:** What does this PR do?
   - **Motivation:** Why is this change needed?
   - **Testing:** How was this tested?
   - **Screenshots:** For UI changes
   - **Breaking Changes:** List any breaking changes

## 📋 Pull Request Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`bun run lint`)
- [ ] Commits are clear and descriptive
- [ ] Documentation is updated (if needed)
- [ ] No unnecessary files are included
- [ ] Branch is up-to-date with `main`
- [ ] PR description is clear and complete

## 🐛 Reporting Bugs

When reporting bugs, include:

1. **Description:** Clear description of the bug
2. **Steps to Reproduce:**
   ```
   1. Go to '...'
   2. Click on '...'
   3. Upload '...'
   4. See error
   ```
3. **Expected Behavior:** What should happen?
4. **Actual Behavior:** What actually happens?
5. **Environment:**
   - OS: [e.g., macOS 14.2]
   - Bun version: [e.g., 1.0.20]
   - Python version: [e.g., 3.11.5]
   - Browser: [e.g., Chrome 120]
6. **Screenshots/Logs:** If applicable
7. **Sample Files:** If related to file processing

## 💡 Feature Requests

When suggesting features:

1. **Use Case:** Describe the problem or need
2. **Proposed Solution:** How would you solve it?
3. **Alternatives:** What alternatives did you consider?
4. **Additional Context:** Any relevant details

## 🔍 Code Review Process

1. **Automated Checks:** Linting and type checks run automatically
2. **Maintainer Review:** A maintainer will review your PR
3. **Feedback:** Address any requested changes
4. **Approval:** Once approved, your PR will be merged

### Review Criteria

Maintainers will evaluate:
- ✅ Code quality and style
- ✅ Test coverage
- ✅ Documentation completeness
- ✅ Performance impact
- ✅ Security implications
- ✅ Backwards compatibility

## 🎯 Priority Areas

We especially welcome contributions in these areas:

1. **Testing:** Unit tests, integration tests, E2E tests
2. **Documentation:** Guides, tutorials, API documentation
3. **Accessibility:** ARIA attributes, keyboard navigation
4. **Performance:** Optimization, caching, lazy loading
5. **Internationalization:** Multi-language support
6. **Security:** Input validation, PII handling improvements

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Bun Documentation](https://bun.sh/docs)
- [Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

## 💬 Communication

- **GitHub Issues:** For bugs and feature requests
- **Pull Requests:** For code contributions
- **Discussions:** For questions and general discussion

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Deal Shield! 🎉

