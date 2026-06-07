# Project Task Bulk Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add atomic bulk assignment for selected tasks on the project detail page.

**Architecture:** A dedicated validated web endpoint calls a transactional task service method. The project detail selected-task menus reuse a shared action descriptor that exposes an assignee submenu populated from existing page data.

**Tech Stack:** Laravel, Inertia, React, Vitest, Playwright

---

### Task 1: Backend Bulk Assignment

**Files:**
- Create: `app/Http/Requests/ProjectTasks/BulkAssignProjectTasksRequest.php`
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ProjectTaskController.php`
- Modify: `app/Services/ProjectTaskService.php`
- Test: `tests/Feature/PlannerTest.php`

- [ ] Write failing feature tests for assignment, unassignment, and invalid scope/group inputs.
- [ ] Run the focused tests and confirm they fail.
- [ ] Add the validated route, controller action, and transactional service method.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Selected-Task Assignment Actions

**Files:**
- Modify: `resources/js/Pages/Projects/projectTaskView.js`
- Modify: `resources/js/Pages/Projects/projectTaskView.test.js`
- Modify: `resources/js/Pages/Projects/Show.jsx`
- Test: `tests/e2e/projects.spec.js`

- [ ] Write failing unit coverage for assignment submenu descriptors.
- [ ] Implement assignment actions and selected-task assignment handler.
- [ ] Render the submenu in both dropdown and context-menu selections.
- [ ] Add an end-to-end assignment test.

### Task 3: Verification

- [ ] Run focused PHP, Vitest, and Playwright tests.
- [ ] Run the full PHP and frontend unit suites.
- [ ] Run `git diff --check`.
