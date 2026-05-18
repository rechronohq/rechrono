# Rechrono

Rechrono is a Laravel, Inertia, and React planner app focused on Gantt-style project and task planning.

This repository contains the open-source-ready planner surface only:

- project and task CRUD
- timeline/Gantt planning
- Hive CSV import
- MCP planner tools
- local app auth and profile management

## Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan rechrono:setup
npm run build
```

`rechrono:setup` creates your admin account and optionally seeds sample projects and tasks. Demo data is not created automatically in production unless you confirm it during setup.

## Development

```bash
composer run dev
```

## API

See [docs/api.md](docs/api.md) for authentication, endpoint, and payload details.

## Tests

```bash
composer test
npm run build
```
