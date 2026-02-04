# Git Merge Conflict Resolution Guide

## Overview

When merging branches in Git, conflicts can occur when the same lines of code have been modified in both branches. Modern Git tools (like VS Code, GitHub, GitKraken, etc.) provide three main options to resolve these conflicts:

1. **Accept Current Change**
2. **Accept Incoming Change**
3. **Accept Both Changes**

This guide explains what each option means, when to use them, and best practices for merging commits into the main branch.

---

## Understanding the Options

### 1. Accept Current Change

**What it does:** Keeps the version from your current branch (HEAD) and discards the incoming change.

**When to use:**
- You're merging another branch into yours, and your version is correct
- The incoming change is outdated or incorrect
- You've already implemented a better solution than what's being merged in

**Example:**
```
<<<<<<< HEAD (Current Change)
const API_URL = "https://api.production.com";
=======
const API_URL = "https://api.staging.com";
>>>>>>> feature-branch (Incoming Change)
```

**Result after "Accept Current Change":**
```javascript
const API_URL = "https://api.production.com";
```

### 2. Accept Incoming Change

**What it does:** Discards your current version and accepts the version from the branch being merged in.

**When to use:**
- The incoming change is more up-to-date or correct
- You're updating your branch with changes from main/master
- The incoming change represents a fix or improvement you want to adopt

**Example:**
```
<<<<<<< HEAD (Current Change)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
=======
function calculateTotal(items) {
  // Fixed: Handle null/undefined items
  return (items || []).reduce((sum, item) => sum + (item?.price || 0), 0);
}
>>>>>>> feature-branch (Incoming Change)
```

**Result after "Accept Incoming Change":**
```javascript
function calculateTotal(items) {
  // Fixed: Handle null/undefined items
  return (items || []).reduce((sum, item) => sum + (item?.price || 0), 0);
}
```

### 3. Accept Both Changes

**What it does:** Keeps both versions, typically placing the current change first and the incoming change second.

**When to use:**
- Both changes add different functionality that doesn't conflict logically
- You're merging configuration files where both entries are needed
- Both changes add new imports, exports, or array items

**When NOT to use:**
- When both changes are alternative implementations (will create broken code)
- When values should be mutually exclusive
- When it would result in duplicate or contradictory code

**Example:**
```
<<<<<<< HEAD (Current Change)
import { useState } from 'react';
=======
import { useEffect } from 'react';
>>>>>>> feature-branch (Incoming Change)
```

**Result after "Accept Both Changes":**
```javascript
import { useState } from 'react';
import { useEffect } from 'react';
```

---

## Best Practices for Merging to Main Branch

### Scenario: Merging Feature Branch into Main

When you want to **merge all commits from a feature branch into the main branch**, follow these guidelines:

#### 1. **Update Your Feature Branch First**

Before merging to main, update your feature branch with the latest main:

```bash
# On your feature branch
git checkout feature-branch
git fetch origin
git merge origin/main
```

This lets you resolve conflicts in your feature branch before the main branch is affected.

#### 2. **Conflict Resolution Strategy**

When merging main into your feature branch (before merging to main):

- **Generally prefer "Accept Incoming Change"** - Accept changes from main/master since it represents the canonical state
- Review each conflict carefully
- Test thoroughly after resolving conflicts

#### 3. **After Resolving Conflicts**

```bash
# After accepting incoming changes from main
git add .
git commit -m "Resolve merge conflicts with main"
git push origin feature-branch
```

#### 4. **Merge to Main**

Once your feature branch is conflict-free and tested:

```bash
# Create a pull request or merge directly
git checkout main
git merge feature-branch
git push origin main
```

### Decision Tree

```
Are you merging TO main or FROM main?
│
├─ TO main (your branch → main)
│  │
│  └─ First merge FROM main into your branch
│     │
│     └─ Conflicts?
│        │
│        ├─ Simple additions (imports, config): Accept Both
│        ├─ Main has the newer/correct version: Accept Incoming (from main)
│        └─ Your code is definitely correct: Accept Current
│           (but reconsider - main is usually canonical)
│
└─ FROM main (main → your branch)
   │
   └─ Conflicts?
      │
      ├─ Main has updates you need: Accept Incoming (from main)
      ├─ Your feature is intentionally different: Accept Current
      └─ Both needed: Accept Both (rare)
```

---

## Common Pitfalls

### ❌ Blindly Accepting Both Changes

```javascript
// WRONG: Both changes are alternatives, not additions
const API_VERSION = "v1";
const API_VERSION = "v2"; // Error: duplicate declaration
```

### ❌ Losing Important Updates

```javascript
// Current: Missing security fix
function authenticate(user) {
  return user.password === storedPassword;
}

// Incoming: Has security fix  
function authenticate(user) {
  return bcrypt.compare(user.password, storedPassword); // ✓ Secure
}
```

**Don't Accept Current Change here** - you'd lose the security fix!

### ✅ Correct: Accepting Both for Additions

```javascript
// Current
export { ComponentA } from './ComponentA';

// Incoming
export { ComponentB } from './ComponentB';

// Accept Both ✓
export { ComponentA } from './ComponentA';
export { ComponentB } from './ComponentB';
```

---

## Recommended Answer for "Merging All Commits to Main"

**Best Practice:**

1. **Merge main into your branch first** (not the other way around)
   ```bash
   git checkout your-branch
   git merge main
   ```

2. **During conflict resolution:**
   - **Default to "Accept Incoming Change"** (from main) for conflicts
   - Main branch represents the canonical, tested state
   - Only use "Accept Current Change" if you're certain your version is better
   - Use "Accept Both Changes" sparingly, only for true additions

3. **After resolving conflicts:**
   - Build and test thoroughly
   - Commit the resolution
   - Create a Pull Request to main
   - Get code review before final merge

4. **Finally merge to main** through a PR or:
   ```bash
   git checkout main
   git merge your-branch  # Should be clean now
   git push origin main
   ```

---

## Tools for Merge Conflict Resolution

### Visual Studio Code
- Provides inline conflict resolution with clickable buttons
- Shows diffs side-by-side
- Syntax highlighting preserved

### Git Command Line
```bash
# View conflicts
git status

# Use merge tool
git mergetool

# After resolving
git add <resolved-files>
git commit
```

### GitHub Pull Requests
- Web-based conflict editor
- Clearly shows both versions
- Easy to review changes before merging

---

## Summary

| Option | Use When | Example Scenario |
|--------|----------|------------------|
| **Accept Current** | Your version is correct and complete | You fixed a bug that incoming doesn't have |
| **Accept Incoming** | The other branch has the right version | Pulling updates from main |
| **Accept Both** | Both changes are additive, not alternative | Adding different imports or config entries |

**For merging to main: Merge main into your branch first, prefer incoming changes from main during conflicts, test thoroughly, then merge to main.**

---

## Additional Resources

- [Git Merge Documentation](https://git-scm.com/docs/git-merge)
- [GitHub Conflict Resolution](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts)
- [VS Code Merge Conflict Resolution](https://code.visualstudio.com/docs/editor/versioncontrol#_merge-conflicts)

---

**Remember:** When in doubt, carefully review what each change does. Automated resolution is powerful but requires understanding the context of your code changes.
