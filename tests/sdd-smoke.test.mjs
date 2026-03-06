import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('project contains SDD baseline files', () => {
  const root = process.cwd();

  const requiredPaths = [
    '.github/workflows/ci.yml',
    '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/spec-proposal.yml',
    'features/left-panel/README.md',
  ];

  for (const rel of requiredPaths) {
    const abs = path.join(root, rel);
    assert.equal(fs.existsSync(abs), true, `Missing required file: ${rel}`);
  }
});
