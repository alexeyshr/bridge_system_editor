## Fix: npm clean script was broken

- Date: 2026-03-06

### Symptom

`npm run clean` failed with:
- `Invalid project directory provided ...\clean`

### Root Cause

`package.json` used `next clean`, but this command is not supported as intended in this setup.

### Change

Replaced `clean` script with a cross-platform Node command that removes:
- `.next`
- `tsconfig.tsbuildinfo`

### Result

`npm run clean` executes successfully.
