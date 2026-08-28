# Rechrono MCP Server

The Rechrono MCP server is available at `/mcp/planner`.

Use this server for private agent integrations that need to inspect or update planner data. The REST API under `/api/{team_slug}` remains the canonical external contract; MCP tools are thin agent-facing wrappers around the same team-scoped planner rules.

## Authentication

The MCP endpoint requires a Laravel Sanctum bearer token.

```http
Authorization: Bearer <plain_text_token>
Accept: application/json
Content-Type: application/json
```

Create tokens from the team settings page. Token abilities map directly to MCP access:

- `planner:read`: can list/read project and task data.
- `planner:write`: includes `planner:read` and can mutate task data.

All tools require `team_slug`. The authenticated token user must belong to that team. Cross-team project, task, and user IDs are rejected.

## Tools

### `list-projects`

Read-only. Requires `planner:read`.

Arguments:

```json
{
  "team_slug": "my-team"
}
```

Returns active, non-template projects for the team with task counts.

Optional `status` values are `active` (default), `archived`, `all`, and `templates`.

### `list-members`

Read-only. Requires `planner:read`. Returns team members and their IDs for task assignment.

### `list-clients`

Read-only. Requires `planner:read`. Returns clients and their IDs for project creation. The optional `status` argument accepts `active` (default), `archived`, or `all`.

### `create-project`

Mutation. Requires `planner:write`.

```json
{
  "team_slug": "my-team",
  "name": "Website launch",
  "description": "Campaign planning",
  "parent_id": null,
  "client_id": null
}
```

### `update-project`

Mutation. Requires `planner:write`. Accepts `project_id` plus any of `name`, `description`, `parent_id`, and `client_id`.

### `archive-project`

Mutation. Requires `planner:write`. Accepts `team_slug` and `project_id`. Archived projects can be found with `list-projects` using `status: archived`.

### `unarchive-project`

Mutation. Requires `planner:write`. Accepts `team_slug` and `project_id` and restores the project to the active planner.

### `list-tasks`

Read-only. Requires `planner:read`.

Arguments:

```json
{
  "team_slug": "my-team",
  "project_id": "optional-project-uuid"
}
```

Returns team tasks, optionally filtered to one project.

### `read-project`

Read-only. Requires `planner:read`.

Arguments:

```json
{
  "team_slug": "my-team",
  "project_id": "project-uuid"
}
```

Returns one project with ordered task resources.

### `create-task`

Mutation. Requires `planner:write`.

Arguments:

```json
{
  "team_slug": "my-team",
  "project_id": "project-uuid",
  "name": "Design review",
  "kind": "task",
  "parent_id": null,
  "description": null,
  "start_date": "2026-06-01",
  "end_date": "2026-06-03",
  "dependency_id": null,
  "assignee_user_id": 1
}
```

Task dates are required for normal tasks. Groups cannot have dates, dependencies, parents, or assignees.

### `reorder-task`

Mutation. Requires `planner:write`.

Arguments:

```json
{
  "team_slug": "my-team",
  "project_id": "project-uuid",
  "task_id": "task-uuid",
  "target_task_id": "target-task-uuid",
  "position": "before"
}
```

Supported positions are `before`, `after`, and `into`. Returns root-level tasks for the project in updated order.

### `update-task`

Mutation. Requires `planner:write`.

Arguments:

```json
{
  "team_slug": "my-team",
  "task_id": "task-uuid",
  "name": "Updated task",
  "description": null,
  "kind": "task",
  "project_id": "project-uuid",
  "parent_id": null,
  "start_date": "2026-06-01",
  "end_date": "2026-06-04",
  "progress": 50,
  "completed": false,
  "interaction": "move",
  "dependency_id": null,
  "assignee_user_id": null
}
```

All fields except `team_slug` and `task_id` are optional.

### `complete-task`

Mutation. Requires `planner:write`.

Arguments:

```json
{
  "team_slug": "my-team",
  "task_id": "task-uuid"
}
```

Marks the task complete through the same completion rules used by the planner API.

## Resources

Resource templates are read-only and require `planner:read`:

- `planner://{team_slug}/projects`
- `planner://{team_slug}/tasks`

## Error Expectations

- Missing or invalid bearer token: HTTP `401`.
- Token lacks required ability: HTTP or tool error equivalent to `403`.
- Team slug does not belong to the token user: `404`.
- Cross-team project, task, or assignee IDs: validation error.
- Invalid dates, task kinds, reorder positions, or group invariants: validation error.

## Client Setup

Configure an HTTP-capable MCP client with the absolute `/mcp/planner` URL. Send the Sanctum token on every request:

```text
Authorization: Bearer <plain_text_token>
```

The Team Settings API tokens screen shows the endpoint and team slug. Client configuration formats differ, so keep real tokens in the client's secret or environment-variable storage rather than committing them to the repository.

## ChatGPT App Status

This is a private agent-ready MCP foundation. It does not include ChatGPT Apps SDK widget metadata, public OAuth onboarding, or app submission assets. Add those only after the REST API and MCP tool contract have stabilized.
