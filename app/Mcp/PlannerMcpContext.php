<?php

namespace App\Mcp;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class PlannerMcpContext
{
    public function canUse(string $ability): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->tokenCan($ability);
    }

    public function requireAbility(string $ability): User
    {
        $user = auth()->user();

        abort_unless($user instanceof User, 401);
        abort_unless($user->tokenCan($ability), 403);

        return $user;
    }

    public function teamForSlug(string $teamSlug, string $ability): Team
    {
        $user = $this->requireAbility($ability);
        $team = Team::query()->where('slug', $teamSlug)->firstOrFail();

        abort_unless($user->team_id === $team->id, 404);

        return $team;
    }

    public function projectForTeam(Team $team, string $projectId, string $field = 'project_id'): Project
    {
        $project = $team->projects()->whereKey($projectId)->first();

        if (! $project) {
            throw ValidationException::withMessages([
                $field => 'The selected project is invalid for this team.',
            ]);
        }

        return $project;
    }

    public function taskForTeam(Team $team, ?string $taskId, string $field = 'task_id'): ?Task
    {
        if ($taskId === null) {
            return null;
        }

        $task = Task::query()
            ->whereKey($taskId)
            ->whereIn('project_id', $team->projects()->select('id'))
            ->first();

        if (! $task) {
            throw ValidationException::withMessages([
                $field => 'The selected task is invalid for this team.',
            ]);
        }

        return $task;
    }

    public function taskForProject(Project $project, ?string $taskId, string $field): ?Task
    {
        if ($taskId === null) {
            return null;
        }

        $task = $project->tasks()->whereKey($taskId)->first();

        if (! $task) {
            throw ValidationException::withMessages([
                $field => 'The selected task is invalid for this project.',
            ]);
        }

        return $task;
    }

    public function userForTeam(Team $team, ?int $userId, string $field = 'assignee_user_id'): ?int
    {
        if ($userId === null) {
            return null;
        }

        if (! $team->users()->whereKey($userId)->exists()) {
            throw ValidationException::withMessages([
                $field => 'The selected user is invalid for this team.',
            ]);
        }

        return $userId;
    }
}
