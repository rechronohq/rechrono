import fs from 'node:fs';
import path from 'node:path';

export const E2E_BASE_URL = 'http://127.0.0.1:4010';

export function parseDotEnv(filePath) {
    const contents = fs.readFileSync(filePath, 'utf8');
    const values = {};

    for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) {
            continue;
        }

        const separator = line.indexOf('=');

        if (separator === -1) {
            continue;
        }

        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        values[key] = value;
    }

    return values;
}

export function e2eDatabasePath(cwd) {
    return path.join(cwd, 'database', 'e2e.sqlite');
}

export function buildE2EEnv(cwd) {
    const env = parseDotEnv(path.join(cwd, '.env'));
    const testingValues = {
        ...env,
        APP_ENV: 'testing',
        APP_URL: E2E_BASE_URL,
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: e2eDatabasePath(cwd),
        CACHE_STORE: 'array',
        QUEUE_CONNECTION: 'sync',
        SESSION_DRIVER: 'file',
    };

    return {
        ...process.env,
        ...testingValues,
    };
}

export function writeTestingDotEnv(cwd) {
    const env = {
        ...parseDotEnv(path.join(cwd, '.env')),
        APP_ENV: 'testing',
        APP_URL: E2E_BASE_URL,
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: e2eDatabasePath(cwd),
        CACHE_STORE: 'array',
        QUEUE_CONNECTION: 'sync',
        SESSION_DRIVER: 'file',
    };
    const testingEnvPath = path.join(cwd, '.env.testing');
    const lines = Object.entries(env).map(([key, value]) => {
        const stringValue = String(value ?? '');
        const needsQuoting = /\s/.test(stringValue);

        return `${key}=${needsQuoting ? `"${stringValue.replaceAll('"', '\\"')}"` : stringValue}`;
    });

    fs.writeFileSync(testingEnvPath, `${lines.join('\n')}\n`);
}
