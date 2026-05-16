import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { buildE2EEnv, e2eDatabasePath, writeTestingDotEnv } from './environment.js';
import { E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD } from './seed-users.js';

export default async function globalSetup() {
    const cwd = process.cwd();
    const env = buildE2EEnv(cwd);
    const dbPath = e2eDatabasePath(cwd);

    fs.closeSync(fs.openSync(dbPath, 'a'));
    writeTestingDotEnv(cwd);

    process.env.E2E_LOGIN_EMAIL = E2E_LOGIN_EMAIL;
    process.env.E2E_LOGIN_PASSWORD = E2E_LOGIN_PASSWORD;

    execSync('php artisan migrate:fresh', {
        cwd,
        env,
        stdio: 'inherit',
    });

    execSync(
        `php artisan rechrono:setup --no-interaction --name="E2E Admin" --email="${E2E_LOGIN_EMAIL}" --password="${E2E_LOGIN_PASSWORD}" --seed-demo`,
        {
            cwd,
            env,
            stdio: 'inherit',
        },
    );
}
