import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // Download VS Code, unzip it and run the integration test
        // Pin VS Code version to match minimum engine requirement for deterministic CI runs
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            version: '1.103.0' // Pinned to minimum supported version from package.json
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();