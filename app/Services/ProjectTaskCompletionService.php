<?php

namespace App\Services;

use App\Models\Task;
use Illuminate\Support\Collection;

class ProjectTaskCompletionService
{
    public function syncAncestorChainsAfterMove(Task $task, string $oldProjectId, array $oldAncestorIds): void
    {
        foreach ($oldAncestorIds as $ancestorId) {
            $children = Task::query()
                ->where('project_id', $oldProjectId)
                ->where('parent_id', $ancestorId)
                ->get(['completed']);

            $completed = $children->isNotEmpty() && $children->every(fn (Task $candidate): bool => $candidate->completed);

            Task::query()
                ->where('id', $ancestorId)
                ->update([
                    'completed' => $completed,
                    'progress' => $completed ? 100 : 0,
                ]);
        }

        $newTasks = Task::query()
            ->where('project_id', $task->project_id)
            ->get(['id', 'parent_id', 'progress', 'completed']);

        foreach ($task->ancestorIds($newTasks) as $ancestorId) {
            $children = $newTasks->filter(fn (Task $candidate): bool => $candidate->parent_id === $ancestorId);
            $completed = $children->isNotEmpty() && $children->every(fn (Task $candidate): bool => $candidate->completed);

            Task::query()
                ->where('id', $ancestorId)
                ->update([
                    'completed' => $completed,
                    'progress' => $completed ? 100 : 0,
                ]);
        }
    }

    public function cascadeCompletionDown(Task $task, bool $completed): void
    {
        $descendants = Task::query()
            ->whereIn('id', $task->descendantIds())
            ->get();

        foreach ($descendants as $descendant) {
            $descendant->update([
                'completed' => $completed,
                'progress' => $completed ? 100 : min($descendant->progress, 99),
            ]);
        }
    }

    public function syncAncestorCompletion(Task $task, Collection $initialTasks): void
    {
        $tasks = Task::query()
            ->where('project_id', $task->project_id)
            ->get(['id', 'parent_id', 'progress', 'completed'])
            ->keyBy('id');

        foreach ($task->ancestorIds($initialTasks) as $ancestorId) {
            $descendants = $tasks->filter(fn (Task $candidate): bool => $candidate->parent_id === $ancestorId);
            $completed = $descendants->isNotEmpty() && $descendants->every(fn (Task $candidate): bool => $candidate->completed);

            Task::query()
                ->where('id', $ancestorId)
                ->update([
                    'completed' => $completed,
                    'progress' => $completed ? 100 : 0,
                ]);
        }
    }
}
