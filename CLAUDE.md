# CLAUDE.md - AI Assistant Guide

> **Last Updated:** 2025-11-16
> **Repository:** powerplantnrg/claude-
> **Purpose:** Comprehensive guide for AI assistants working with this codebase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Development Workflows](#development-workflows)
4. [Code Conventions](#code-conventions)
5. [Git Practices](#git-practices)
6. [Testing Guidelines](#testing-guidelines)
7. [AI Assistant Guidelines](#ai-assistant-guidelines)
8. [Common Tasks](#common-tasks)

---

## Project Overview

### Current Status
- **Stage:** Initial setup / Early development
- **Primary Language:** TBD
- **Framework/Stack:** TBD
- **Dependencies:** TBD

### Project Purpose
*To be documented as the project evolves*

### Key Features
*To be documented as features are implemented*

---

## Repository Structure

```
claude-/
├── .git/                 # Git version control
├── README.md            # Project documentation
└── CLAUDE.md           # This file - AI assistant guide
```

### Directory Organization
*To be updated as the project structure develops. Suggested structure:*

```
src/                    # Source code
├── components/         # Reusable components
├── services/          # Business logic and services
├── utils/             # Utility functions
└── types/             # Type definitions

tests/                 # Test files
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/               # End-to-end tests

docs/                  # Additional documentation
config/                # Configuration files
scripts/               # Build and utility scripts
```

---

## Development Workflows

### Branch Strategy

**Main Branches:**
- `main` / `master` - Production-ready code
- `develop` - Integration branch for features (if applicable)

**Feature Branches:**
- Pattern: `claude/<descriptive-name>-<session-id>`
- Example: `claude/add-authentication-abc123xyz`
- Always branch from the appropriate base branch
- Delete after merging

### Development Process

1. **Start New Feature**
   ```bash
   git checkout -b claude/feature-name-session-id
   ```

2. **Make Changes**
   - Write code following conventions
   - Test thoroughly
   - Document as needed

3. **Commit**
   ```bash
   git add .
   git commit -m "descriptive message"
   ```

4. **Push**
   ```bash
   git push -u origin claude/feature-name-session-id
   ```

5. **Create Pull Request**
   - Use descriptive title
   - Include summary of changes
   - Reference related issues

---

## Code Conventions

### General Principles

1. **Clarity over Cleverness**
   - Write code that is easy to understand
   - Use descriptive variable and function names
   - Add comments for complex logic

2. **DRY (Don't Repeat Yourself)**
   - Extract repeated code into functions/modules
   - Create reusable components

3. **SOLID Principles**
   - Single Responsibility
   - Open/Closed
   - Liskov Substitution
   - Interface Segregation
   - Dependency Inversion

### Naming Conventions

*To be defined based on chosen language/framework. Common patterns:*

- **Variables:** `camelCase` or `snake_case`
- **Functions:** `camelCase` or `snake_case`
- **Classes:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Files:** `kebab-case` or `PascalCase` (depending on context)

### Code Style

*To be defined. Consider using:*
- Linters (ESLint, Pylint, etc.)
- Formatters (Prettier, Black, etc.)
- Style guides (Airbnb, Google, etc.)

### Comments and Documentation

```
// Good: Explains WHY, not WHAT
// Cache results to avoid expensive API calls during rapid user input
const cachedResults = memoize(fetchResults);

// Bad: States the obvious
// Set x to 5
const x = 5;
```

**Documentation Requirements:**
- Public APIs must have docstrings/JSDoc
- Complex algorithms need explanation comments
- Non-obvious business logic requires context

---

## Git Practices

### Commit Messages

Follow the conventional commits pattern:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Maintain, dependencies, etc.

**Examples:**
```
feat(auth): add JWT token validation

Implement middleware to validate JWT tokens on protected routes.
Includes token expiration checking and signature verification.

Closes #123
```

```
fix(api): handle null response from external service

Add null check before processing API response to prevent crashes.
```

### Commit Frequency

- Commit logical units of work
- Don't commit broken code to shared branches
- Commit before context switching
- Use meaningful commit messages

### Git Workflow Commands

```bash
# Create and switch to feature branch
git checkout -b claude/feature-name-session-id

# Stage changes
git add <files>
# OR stage all
git add .

# Commit with message
git commit -m "type(scope): description"

# Push to remote
git push -u origin claude/feature-name-session-id

# Update from remote
git fetch origin
git pull origin branch-name
```

### Handling Merge Conflicts

1. Fetch latest changes
2. Merge/rebase with base branch
3. Resolve conflicts carefully
4. Test after resolution
5. Commit resolved changes

---

## Testing Guidelines

### Testing Strategy

*To be defined based on project needs. Suggested approach:*

1. **Unit Tests**
   - Test individual functions/methods
   - Mock external dependencies
   - Aim for high coverage of critical paths

2. **Integration Tests**
   - Test component interactions
   - Test with real dependencies where appropriate
   - Validate data flow

3. **End-to-End Tests**
   - Test complete user workflows
   - Validate critical paths
   - Keep minimal (they're slow)

### Running Tests

```bash
# To be defined based on testing framework
npm test          # or
pytest            # or
cargo test        # etc.
```

### Test Conventions

- Test files co-located with source or in `/tests` directory
- Naming: `*.test.js`, `*_test.py`, `test_*.py`, etc.
- One test file per source file (generally)
- Descriptive test names that explain what's being tested

---

## AI Assistant Guidelines

### General Principles

1. **Read Before Writing**
   - Always read existing files before editing
   - Understand context before making changes
   - Check for similar existing implementations

2. **Maintain Consistency**
   - Follow existing patterns in the codebase
   - Match the style of surrounding code
   - Don't introduce new patterns without discussion

3. **Be Security Conscious**
   - Avoid SQL injection vulnerabilities
   - Prevent XSS attacks
   - Don't expose sensitive data
   - Validate and sanitize inputs
   - Follow OWASP Top 10 guidelines

4. **Error Handling**
   - Always handle potential errors
   - Provide meaningful error messages
   - Log errors appropriately
   - Don't swallow exceptions silently

5. **Performance Awareness**
   - Consider algorithmic complexity
   - Avoid unnecessary computations
   - Be mindful of memory usage
   - Optimize hot paths

### Task Workflow

When assigned a task:

1. **Understand Requirements**
   - Read the task description carefully
   - Ask clarifying questions if needed
   - Identify acceptance criteria

2. **Research**
   - Explore relevant parts of codebase
   - Check for existing implementations
   - Review related documentation

3. **Plan**
   - Break down complex tasks
   - Identify dependencies
   - Consider edge cases

4. **Implement**
   - Write clean, maintainable code
   - Follow conventions
   - Add tests
   - Document as needed

5. **Verify**
   - Test your changes
   - Run existing tests
   - Check for regressions
   - Review your own code

6. **Commit and Push**
   - Write clear commit messages
   - Push to appropriate branch
   - Create PR if required

### Tools and Commands

**Preferred Tools:**
- Use `Read` for reading files (not `cat`)
- Use `Edit` for editing files (not `sed`/`awk`)
- Use `Write` for new files (not `echo` redirects)
- Use `Grep` for searching (not `grep` command)
- Use `Glob` for finding files (not `find`)

**When to Use Task/Explore Agents:**
- Understanding large portions of codebase
- Open-ended exploration
- Multi-file analysis
- Pattern discovery

### File Operations

```bash
# Reading files
Use Read tool with file path

# Searching for patterns
Use Grep tool with pattern and options

# Finding files
Use Glob tool with pattern

# Editing files
Use Edit tool with old_string and new_string

# Creating new files
Use Write tool (only when necessary)
```

### Communication

- Be concise and clear
- Report progress on complex tasks
- Explain non-obvious decisions
- Ask questions when uncertain
- Don't use emojis unless requested

---

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Explore relevant existing code
3. Implement feature following conventions
4. Add tests
5. Update documentation
6. Commit and push
7. Create pull request

### Fixing a Bug

1. Reproduce the bug
2. Locate the problematic code
3. Understand root cause
4. Implement fix
5. Add regression test
6. Verify fix works
7. Commit and push

### Refactoring Code

1. Understand current implementation
2. Ensure tests exist and pass
3. Make incremental changes
4. Run tests after each change
5. Maintain same functionality
6. Update documentation if needed
7. Commit and push

### Adding Documentation

1. Identify what needs documentation
2. Read existing documentation style
3. Write clear, concise documentation
4. Include examples where helpful
5. Keep it up to date
6. Commit and push

### Code Review Checklist

Before submitting code:

- [ ] Code follows project conventions
- [ ] No security vulnerabilities introduced
- [ ] Error handling is appropriate
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No debugging code left in
- [ ] Performance is acceptable
- [ ] Code is readable and maintainable

---

## Project-Specific Notes

### Dependencies

*To be updated as dependencies are added*

### Environment Setup

*To be documented when development environment is established*

### Configuration

*To be documented when configuration files are added*

### Deployment

*To be documented when deployment process is established*

---

## Resources

### Documentation Links
- [Project README](./README.md)

### External Resources
*Add relevant links to:*
- Framework documentation
- API documentation
- Design documents
- Style guides

---

## Changelog

### 2025-11-16
- Initial CLAUDE.md creation
- Established structure and guidelines
- Set up templates for future documentation

---

## Contributing to This Document

This document should be kept up to date as the project evolves:

1. Update when new conventions are established
2. Document new workflows as they're adopted
3. Add examples of common patterns
4. Keep the structure section current
5. Maintain the changelog

**Note for AI Assistants:** When you notice this document is outdated or when you establish new patterns, update this file accordingly.
