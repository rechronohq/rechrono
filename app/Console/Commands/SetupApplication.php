<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class SetupApplication extends Command
{
    protected $signature = 'rechrono:setup
                            {--name= : The admin display name}
                            {--email= : The admin email address}
                            {--password= : The admin password}
                            {--seed-demo : Seed default projects and tasks}
                            {--no-seed-demo : Skip seeding demo data}
                            {--force : Update an existing user with the same email}';

    protected $description = 'Create the first admin account and optionally seed demo planner data';

    public function handle(): int
    {
        $name = $this->option('name') ?? $this->ask('Admin name');
        $email = $this->option('email') ?? $this->ask('Admin email');
        $password = $this->option('password') ?? $this->secret('Admin password');

        if (! $this->option('password') && ! $this->option('no-interaction')) {
            $passwordConfirmation = $this->secret('Confirm password');

            if ($password !== $passwordConfirmation) {
                $this->components->error('Passwords do not match.');

                return self::FAILURE;
            }
        }

        $validator = Validator::make(
            [
                'name' => $name,
                'email' => $email,
                'password' => $password,
            ],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255'],
                'password' => ['required', Password::defaults()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->components->error($message);
            }

            return self::FAILURE;
        }

        $existingUser = User::query()->where('email', $email)->first();

        if ($existingUser && ! $this->option('force')) {
            $this->components->error("A user with email [{$email}] already exists. Use --force to update that account.");

            return self::FAILURE;
        }

        if (
            ! $this->option('force')
            && User::query()->where('is_admin', true)->exists()
            && (! $existingUser || ! $existingUser->is_admin)
        ) {
            $this->components->warn('An admin account already exists.');

            if (! $this->confirm('Create another admin anyway?', false)) {
                return self::SUCCESS;
            }
        }

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'is_admin' => true,
            ],
        );

        $this->components->info($existingUser ? "Updated admin [{$user->email}]." : "Created admin [{$user->email}].");

        if ($this->shouldSeedDemo()) {
            $this->call(DemoDataSeeder::class);
            $this->components->info('Seeded default projects and tasks.');
        } else {
            $this->line('Skipped demo project and task seeding.');
        }

        return self::SUCCESS;
    }

    protected function shouldSeedDemo(): bool
    {
        if ($this->option('seed-demo')) {
            return true;
        }

        if ($this->option('no-seed-demo')) {
            return false;
        }

        if ($this->option('no-interaction')) {
            return false;
        }

        return $this->confirm(
            'Seed default projects and tasks? (recommended for local development)',
            true,
        );
    }
}
