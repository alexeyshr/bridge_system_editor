## Fix: Repository cleanup and full README refresh

- Date: 2026-03-06

### What was done

1. Replaced placeholder `readme.md` with full project documentation:
   - features
   - run/setup scripts
   - data format
   - structure
   - SDD workflow and troubleshooting
2. Removed unused tracked files:
   - root: `logo.png`, `logo.svg`, `metadata.json`, `.eslintrc.json`
   - public: `logo.png`, `logo.svg`, `logo_vector_source.png`
3. Kept only actively used header logo asset: `public/logo_header.png`.
4. Cleaned local build artifacts (`.next`, `tsconfig.tsbuildinfo`).

### Validation

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run build` passed
