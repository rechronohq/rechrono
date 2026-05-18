<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class ProjectTaskDuplicationService
{
    public function duplicate(Project $project, Task $task): Task
    {
        abort_unless($task->project_id === $project->id, 404);

        return DB::transaction(function () use ($project, $task): Task {
            $taskMap = [];
            $copy = $this->duplicateTaskTree($task, $project->id, $task->parent_id, $taskMap, $task->isGroup());

            if ($copy->parent_id === null) {
                $siblings = $project->tasks()
                    ->whereNull('parent_id')
                    ->orderBy('sort_order')
                    ->pluck('id')
                    ->all();

                $this->insertTaskAfter($siblings, $task->id, $copy->id);
            } else {
                $siblings = $project->tasks()
                    ->where('parent_id', $copy->parent_id)
                    ->orderBy('sort_order')
                    ->pluck('id')
                    ->all();

                $this->insertTaskAfter($siblings, $task->id, $copy->id);
            }

            foreach ($task->descendantsAndSelf() as $sourceTask) {
                if ($sourceTask->dependency_id !== null && isset($taskMap[$sourceTask->id], $taskMap[$sourceTask->dependency_id])) {
                    Task::query()
                        ->where('id', $taskMap[$sourceTask->id])
                        ->update(['dependency_id' => $taskMap[$sourceTask->dependency_id]]);
                }
            }

            return $copy;
        });
    }

    protected function duplicateTaskTree(Task $sourceTask, string $projectId, ?string $parentId, array &$taskMap, bool $resetState = false): Task
    {
        $baseName = $sourceTask->isGroup()
            ? preg_replace('/\s+Group$/i', '', $sourceTask->name) ?? $sourceTask->name
            : $sourceTask->name;

        $copy = Task::query()->create([
            'project_id' => $projectId,
            'parent_id' => $parentId,
            'kind' => $sourceTask->kind,
            'name' => $this->duplicateName($baseName, Task::query()->where('project_id', $projectId)->pluck('name')->all()),
            'description' => $sourceTask->description,
            'start_date' => $sourceTask->isGroup() ? null : $sourceTask->start_date,
            'end_date' => $sourceTask->isGroup() ? null : $sourceTask->end_date,
            'progress' => $resetState ? 0 : $sourceTask->progress,
            'assignee_user_id' => $resetState ? null : $sourceTask->assignee_user_id,
            'completed' => $resetState ? false : $sourceTask->completed,
            'sort_order' => Task::query()
                ->where('project_id', $projectId)
                ->where('parent_id', $parentId)
                ->max('sort_order') + 1,
        ]);

        $taskMap[$sourceTask->id] = $copy->id;

        foreach ($sourceTask->children as $child) {
            $this->duplicateTaskTree($child, $projectId, $copy->id, $taskMap, $resetState);
        }

        return $copy;
    }

    protected function duplicateName(string $baseName, array $existingNames): string
    {
        $candidate = sprintf('%s Copy', $baseName);
        $suffix = 2;

        while (in_array($candidate, $existingNames, true)) {
            $candidate = sprintf('%s Copy %d', $baseName, $suffix);
            $suffix++;
        }

        return $candidate;
    }

    protected function insertTaskAfter(array $orderedIds, string $sourceId, string $copyId): void
    {
        $ids = array_values(array_filter($orderedIds, fn (string $id): bool => $id !== $copyId));
        $sourceIndex = array_search($sourceId, $ids, true);

        if ($sourceIndex === false) {
            $ids[] = $copyId;
        } else {
            array_splice($ids, $sourceIndex + 1, 0, [$copyId]);
        }

        foreach ($ids as $index => $taskId) {
            Task::query()
                ->where('id', $taskId)
                ->update(['sort_order' => $index + 1]);
        }
    }
}
