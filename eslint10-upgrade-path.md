# ESLint 9.39.2 to 10.0.0 Upgrade Evaluation

## Context

ESLint 10.0.0 was released on Feb 6, 2026. This evaluation assesses the feasibility and impact of upgrading from the current ESLint 9.39.2 in central-settlement. The key finding is that the upgrade is **blocked by the `standard` package dependency** and requires a toolchain migration, not just a version bump.

## Critical Finding: Dual ESLint Situation

The project has two ESLint installations that serve different purposes:

| Component | Version | Used By | Works? |
|-----------|---------|---------|--------|
| `eslint` (devDependency) | 9.39.2 | `npm run eslint` | **No** - no `eslint.config.js` exists |
| `eslint` (bundled in standard) | ^8.41.0 | `npm run lint` (via `standard`) | **Yes** - uses internal eslintrc |

**The top-level `eslint` 9.39.2 is effectively unused.** All actual linting runs through `standard` 17.1.2, which bundles its own ESLint 8.x and uses the legacy eslintrc config format.

## ESLint 10.0.0 Breaking Changes Relevant to This Project

### CRITICAL - Blocks upgrade entirely

1. **eslintrc config system completely removed** - `standard` 17.x relies on eslintrc internally. ESLint 10 only supports flat config (`eslint.config.js`). `standard` is incompatible with ESLint 10.
2. **`@eslint/plugin-kit` override conflict** - `package.json` pins `@eslint/plugin-kit` to `0.3.4`; ESLint 10 requires `^0.6.0`. Override must be removed/updated.

### HIGH - Requires code changes

3. **`eslint-env` comments now error** - `test/int/index.test.js:1` has `/* eslint-env jest */`. Must be removed and replaced with config-level globals.

### MEDIUM - Behavioral changes to verify

4. **Config lookup from file directory** instead of cwd (minor for single-package repo)
5. **Updated `eslint:recommended`** adds 3 new rules: `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`
6. **`no-shadow-restricted-names`** now reports `globalThis` shadowing by default

### LOW / Not Applicable

7. Node.js >= 20.19.0 required - **OK**, project uses 22.22.0
8. JSX reference tracking changes - **N/A**, zero JSX files in project
9. Deprecated context/SourceCode method removal - **N/A**, project doesn't author ESLint plugins
10. minimatch v10 POSIX classes - **Low risk**, only one simple ignore path

## Complete List of ESLint 10 Breaking Changes

For reference, the full set of breaking changes in ESLint 10.0.0:

### For Users
- Node.js < v20.19, v21, v23 no longer supported
- `.eslintrc.*` and `.eslintignore` files no longer recognized
- `ESLINT_USE_FLAT_CONFIG` environment variable no longer honored
- CLI flags removed: `--no-eslintrc`, `--env`, `--resolve-plugins-relative-to`, `--rulesdir`, `--ignore-path`
- `/* eslint-env */` comments produce errors
- Config lookup starts from linted file's directory, not cwd
- `eslint:recommended` adds `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`
- `no-shadow-restricted-names` reports `globalThis` by default
- `radix` rule string options `"always"` and `"as-needed"` deprecated
- `func-names` rule rejects extra array elements
- `no-invalid-regexp` `allowConstructorFlags` rejects duplicate flags
- Stylish formatter uses Node.js `styleText` instead of Chalk (respects `NO_COLOR`, `NODE_DISABLE_COLORS`, `FORCE_COLOR`)
- POSIX character classes supported in glob patterns (minimatch v10)
- jiti < v2.2.0 no longer supported (TypeScript configs)
- `name` property restored on `@eslint/js` configs (update `@eslint/eslintrc` if using `FlatCompat`)

### For Plugin Developers
- Deprecated context methods removed: `getCwd()`, `getFilename()`, `getPhysicalFilename()`, `getSourceCode()`, `parserOptions`, `parserPath`
- Deprecated SourceCode methods removed: `getTokenOrCommentBefore()`, `getTokenOrCommentAfter()`, `isSpaceBetweenTokens()`, `getJSDocComment()`
- `Program` AST node range spans entire source text including leading/trailing comments
- Fixer methods require `text` argument to be a string (throws TypeError otherwise)
- Custom ScopeManager must auto-resolve global variable references and provide `addGlobals(names)` method
- `RuleTester`: `type` property removed from error objects; valid test cases cannot include `errors`/`output`

### For Integration Developers
- `LegacyESLint` and `FileEnumerator` classes removed
- `FlatESLint` removed (use `ESLint` class directly)
- `LintMessage#nodeType` property removed

## `standard` Package Status

- **Last published**: ~1 year ago (v17.1.2)
- **Effectively unmaintained** - no ESLint 9 or 10 support, no planned updates
- **Successor**: [`neostandard`](https://github.com/neostandard/neostandard) - flat config native, same rule set
- **neostandard latest**: 0.12.2 (July 2025), peerDependency `eslint: ^9.0.0` - does NOT yet support ESLint 10

## Recommendation: Two-Phase Migration

### Phase 1: Migrate `standard` to `neostandard` + ESLint 9.39.2 (do now)

This phase delivers the critical value: moving off the unmaintained `standard` package to a flat config setup.

**Files to modify:**

1. **`package.json`**
   - Remove `"standard": "17.1.2"` from devDependencies
   - Add `"neostandard": "^0.12.2"` to devDependencies
   - Keep `"eslint": "9.39.2"`
   - Update scripts: `"lint": "eslint ."`, `"lint:fix": "eslint . --fix"`
   - Remove `"eslint"` script (now redundant with `"lint"`)
   - Remove `"standard": { "ignore": [...] }` config block
   - Evaluate removing `"@eslint/plugin-kit": "0.3.4"` override

2. **`eslint.config.js`** (NEW)
   - Create flat config using neostandard with `noJsx: true`
   - Port ignore pattern from standard config
   - Add jest globals for `test/int/**/*.test.js` files
   - Use CommonJS format (project has no `"type": "module"`) or name it `.mjs`

3. **`test/int/index.test.js`**
   - Remove `/* eslint-env jest */` comment on line 1

**Steps:**
```bash
# 1. Install neostandard, remove standard
npm uninstall standard
npm install --save-dev neostandard

# 2. Generate initial flat config
npx neostandard --migrate > eslint.config.mjs
# Then manually adjust: add noJsx, ignores, test globals

# 3. Update package.json scripts and remove standard config block

# 4. Remove eslint-env comment from test/int/index.test.js

# 5. Run lint and compare output
npm run lint

# 6. Run full test suite
npm run test:unit
```

### Phase 2: Bump to ESLint 10.0.0 (when neostandard supports it)

Monitor [neostandard releases](https://github.com/neostandard/neostandard/releases) for a version with `eslint: >=9.0.0` or `^9.0.0 || ^10.0.0` peerDependency.

**When ready:**
- Bump `"eslint": "10.0.0"` in package.json
- Remove `"@eslint/plugin-kit": "0.3.4"` override (ESLint 10 needs `^0.6.0`)
- Scan for `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error` violations if using `eslint:recommended`
- Run full lint + test regression

## Verification

After Phase 1:
1. `npm run lint` passes with zero errors (or same baseline as current `standard` output)
2. `npm run lint:fix` auto-fixes issues correctly
3. `npm run test:unit` passes (all 362+ tests)
4. Pre-commit hook (`lint`, `dep:check`, `test:unit`) passes
5. No `eslint-env` comments remain: `grep -r "eslint-env" src/ test/` returns nothing

## Risk Summary

| Risk | Mitigation |
|------|------------|
| neostandard rules differ subtly from standard | Run both linters before switching; neostandard replicates standard closely |
| neostandard doesn't add ESLint 10 support soon | Phase 1 is independently valuable |
| CI orb expects `standard` command | Orb runs `npm run lint`, not `standard` directly; script update suffices |
| `@eslint/plugin-kit` override removal breaks deps | Test after removal; the override was a compatibility shim for older versions |

## Sources

- [ESLint v10.0.0 released](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)
- [Migrate to ESLint v10.x](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
- [What's coming in ESLint v10.0.0](https://eslint.org/blog/2025/10/whats-coming-in-eslint-10.0.0/)
- [neostandard](https://github.com/neostandard/neostandard)
