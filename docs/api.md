# Rechrono API

The API is available under `/api/{team_slug}` and uses Laravel Sanctum bearer tokens.

Private agent integrations can also use the MCP server documented in [mcp.md](mcp.md). The REST API remains the canonical external contract; MCP tools are scoped wrappers around the same planner rules.

Create a token from the team settings page, then send it with each request:

```http
Authorization: Bearer <plain_text_token>
Accept: application/json
Content-Type: application/json
```

Requests are scoped to the team in the URL. A valid token must belong to a member of that team.

Token access levels:

- Read only: can call `GET` endpoints.
- Read and write: can call all read endpoints plus project and task mutation endpoints.

## Members

### List Members

```http
GET /api/{team_slug}/members
```

Returns team members ordered by name. Use this endpoint to discover valid `assignee_user_id` values.

Member resources include:

```json
{
  "id": 1,
  "team_id": "team-uuid",
  "name": "Sofia Chen",
  "email": "sofia@example.com"
}
```

## Projects

### List Projects

```http
GET /api/{team_slug}/projects
```

Returns active team projects ordered by `created_at`.

### Create Project

```http
POST /api/{team_slug}/projects
```

Body:

```json
{
  "name": "Website launch",
  "description": "Campaign planning",
  "client_id": "client-uuid"
}
```

Supported fields:

- `name`: required string, max 255 characters
- `description`: nullable string
- `parent_id`: nullable project UUID
- `client_id`: nullable active team client UUID for root projects; omitted or `null` means internal

Returns `201 Created` with the project resource.

### Create Project From Template

```http
POST /api/{team_slug}/projects/from-template
```

Body:

```json
{
  "template_project_id": "template-project-uuid",
  "name": "Client launch",
  "parent_id": null
}
```

Supported fields:

- `template_project_id`: required template project UUID
- `name`: required string, max 255 characters
- `parent_id`: nullable project UUID
- `client_id`: nullable active team client UUID when creating a root project

Returns `201 Created` with the created project resource.

### Read Project

```http
GET /api/{team_slug}/projects/{project_id}
```

Returns the project and its ordered tasks.

### Update Project

```http
PATCH /api/{team_slug}/projects/{project_id}
```

Body:

```json
{
  "name": "Website launch v2",
  "description": "Updated campaign planning"
}
```

Supported fields:

- `name`: required string, max 255 characters
- `description`: nullable string
- `parent_id`: nullable project UUID
- `client_id`: nullable active team client UUID for root projects

Project resources expose the effective client for both roots and subprojects:

```json
{
  "client_id": "client-uuid",
  "client": {
    "id": "client-uuid",
    "name": "Acme"
  }
}
```

For internal projects, both values are `null`. Subprojects inherit these values from their parent project.

Returns the updated project resource.

### Duplicate Project

```http
POST /api/{team_slug}/projects/{project_id}/duplicate
```

Duplicates the project tree and returns `201 Created` with the duplicated project resource.

### Save Project As Template

```http
POST /api/{team_slug}/projects/{project_id}/template
```

Creates a template copy of the project tree and returns `201 Created` with the template project resource.

### Bulk Project Action

```http
POST /api/{team_slug}/projects/bulk-action
```

Body:

```json
{
  "action": "archive",
  "project_ids": ["project-uuid"]
}
```

Supported actions:

- `archive`
- `unarchive`
- `change-parent`
- `delete`

For `change-parent`, include `parent_id` with a project UUID or `null`.

Returns the affected project resources. Deleted projects are omitted because they no longer exist.

### Delete Project

```http
DELETE /api/{team_slug}/projects/{project_id}
```

Deletes the project tree and returns `204 No Content`.

## Tasks

### Create Task

```http
POST /api/{team_slug}/projects/{project_id}/tasks
```

Body:

```json
{
  "name": "Design review",
  "kind": "task",
  "start_date": "2026-06-01",
  "end_date": "2026-06-03",
  "assignee_user_id": 1
}
```

Supported fields:

- `name`: required string, max 255 characters
- `description`: nullable string
- `kind`: nullable `task` or `group`
- `parent_id`: nullable task UUID
- `start_date`: nullable date
- `end_date`: nullable date after or equal to `start_date`
- `dependency_id`: nullable task UUID
- `assignee_user_id`: nullable user ID

Returns `201 Created` with the task resource.

### Update Task

```http
PATCH /api/{team_slug}/projects/{project_id}/tasks/{task_id}
```

Body:

```json
{
  "progress": 50,
  "completed": false
}
```

Supported fields:

- `name`: string, max 255 characters
- `description`: nullable string
- `kind`: `task` or `group`
- `project_id`: project UUID
- `parent_id`: nullable task UUID
- `start_date`: date
- `end_date`: date after or equal to `start_date`
- `progress`: integer from 0 to 100
- `completed`: boolean
- `interaction`: `move`, `resize_left`, `resize_right`, `dependency_set`, or `dependency_clear`
- `dependency_id`: nullable task UUID
- `assignee_user_id`: nullable user ID

Returns the updated task resource.

### Duplicate Task

```http
POST /api/{team_slug}/projects/{project_id}/tasks/{task_id}/duplicate
```

Duplicates the task tree and returns `201 Created` with the duplicated task resource.

### Reorder Task

```http
POST /api/{team_slug}/projects/{project_id}/tasks/reorder
```

Body:

```json
{
  "task_id": "task-uuid",
  "target_task_id": "target-task-uuid",
  "position": "before"
}
```

Supported positions:

- `before`
- `after`
- `into`

Returns root-level task resources for the project in their updated order.

### Delete Task

```http
DELETE /api/{team_slug}/projects/{project_id}/tasks/{task_id}
```

Deletes the task tree and returns `204 No Content`.

## Resources

Project resources include:

```json
{
  "id": "project-uuid",
  "team_id": "team-uuid",
  "parent_id": null,
  "name": "Website launch",
  "description": "Campaign planning",
  "is_template": false,
  "is_active": true,
  "created_at": "2026-05-18T13:00:00.000000Z",
  "updated_at": "2026-05-18T13:00:00.000000Z",
  "tasks": []
}
```

Task resources include:

```json
{
  "id": "task-uuid",
  "project_id": "project-uuid",
  "parent_id": null,
  "kind": "task",
  "name": "Design review",
  "description": null,
  "start_date": "2026-06-01",
  "end_date": "2026-06-03",
  "progress": 0,
  "completed": false,
  "dependency_id": null,
  "assignee_user_id": 1,
  "sort_order": 10,
  "created_at": "2026-05-18T13:00:00.000000Z",
  "updated_at": "2026-05-18T13:00:00.000000Z"
}
```
