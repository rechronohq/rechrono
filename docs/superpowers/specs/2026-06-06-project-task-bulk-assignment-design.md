# Project Task Bulk Assignment Design

## Goal

Allow users to assign multiple selected tasks from the project detail page to a team member or to Unassigned.

## Behavior

- The selected-task dropdown and selected-task context menu expose an `Assign selected` submenu.
- The submenu lists `Unassigned` followed by all team members already supplied to the page.
- Assignment applies only to regular tasks, never groups.
- A successful assignment clears the selection and reloads the project detail data.
- When tasks are grouped by person, reassigned tasks move to the correct person section after reload.

## API

Add `POST /{team}/projects/{project}/tasks/bulk-assign` with:

```json
{
  "task_ids": ["task-uuid"],
  "assignee_user_id": 1
}
```

`assignee_user_id` may be null for Unassigned. The request validates that every task belongs to the project and the assignee belongs to the team. The service updates all tasks in one database transaction and rejects groups.

## Testing

- Feature coverage for successful assignment, unassignment, cross-project task rejection, cross-team assignee rejection, and group rejection.
- Unit coverage for selected-task assignment action construction.
- End-to-end coverage for assigning selected tasks from the project detail page.
