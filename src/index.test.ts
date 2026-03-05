import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

import { processFiles } from './index.ts';

describe('substitute-file-hashes', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `substitute-file-hashes-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should replace hashFile with actual file hash', async () => {
    // 1. Create a target file to be hashed
    const targetFilePath = join(testDir, 'config.json');
    const targetContent = '{"key": "value"}';
    await writeFile(targetFilePath, targetContent, 'utf8');

    // Calculate expected hash
    const expectedHash = createHash('sha256').update(targetContent).digest('hex');

    // 2. Create a file containing the hashFile syntax
    const deploymentFilePath = join(testDir, 'deployment.yaml');
    const deploymentContent = `
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    config-hash: \${{ hashFile('${targetFilePath}') }}
`;
    await writeFile(deploymentFilePath, deploymentContent, 'utf8');

    // 3. Run the processFiles function
    const result = await processFiles(join(testDir, '*.yaml'), 'sha256');

    // 4. Verify the results
    assert.strictEqual(result.processedCount, 1, 'Should process 1 file');
    assert.strictEqual(result.modifiedCount, 1, 'Should modify 1 file');

    const updatedContent = await readFile(deploymentFilePath, 'utf8');
    assert.ok(updatedContent.includes(`config-hash: ${expectedHash}`), 'The hash should be injected into the file');
    assert.ok(!updatedContent.includes('hashFile'), 'The hashFile syntax should be removed');
  });

  it('should not modify file if target file does not exist and throwIfFileNotExists is false', async () => {
    const deploymentFilePath = join(testDir, 'deployment-missing.yaml');
    const deploymentContent = `
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    config-hash: \${{ hashFile('${join(testDir, 'missing.json')}') }}
`;
    await writeFile(deploymentFilePath, deploymentContent, 'utf8');

    const result = await processFiles(join(testDir, 'deployment-missing.yaml'), 'sha256', false);

    assert.strictEqual(result.processedCount, 1, 'Should process 1 file');
    assert.strictEqual(result.modifiedCount, 0, 'Should modify 0 files');

    const updatedContent = await readFile(deploymentFilePath, 'utf8');
    assert.strictEqual(updatedContent, deploymentContent, 'File content should remain unchanged');
  });

  it('should fail if target file does not exist and throwIfFileNotExists is true', async () => {
    const missingTargetPath = join(testDir, 'missing-strict.json');
    const deploymentFilePath = join(testDir, 'deployment-strict.yaml');
    const deploymentContent = `
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    config-hash: \${{ hashFile('${missingTargetPath}') }}
`;
    await writeFile(deploymentFilePath, deploymentContent, 'utf8');

    await assert.rejects(
      () => processFiles(join(testDir, 'deployment-strict.yaml'), 'sha256', true),
      /File not found for hashFile/
    );
  });
});
