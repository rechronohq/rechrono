<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskStructureService
{
    public function parentForCreate(Project $project, ?string $parentId): ?Task
    {
        if ($parentId === null) {
            return null;
        }

        $parent = $project->tasks()->findOrFail($parentId);

        abort_if($this->depthFor($project, $parent) >= 2, 422, 'Maximum nesting depth reached.');

        return $parent;
    }

    public function validatedParent(array $validated, Project $targetProject, Task $task, ?Collection $allTasks = null): ?Task
    {
        if ($task->isGroup()) {
            if (array_key_exists('parent_id', $validated) && $validated['parent_id'] !== null) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Groups must be root-level tasks.',
                ]);
            }

            return null;
        }

        if (! array_key_exists('parent_id', $validated)) {
            return $task->parent_id && $task->project_id === $targetProject->id
                ? $targetProject->tasks()->findOrFail($task->parent_id)
                : null;
        }

        $parentId = $validated['parent_id'];

        if ($parentId === null) {
            return null;
        }

        $parent = $targetProject->tasks()->findOrFail($parentId);
        $tasks = $allTasks ?? $targetProject->tasks()->get(['id', 'parent_id', 'sort_order']);

        abort_if($parent->id === $task->id, 422, 'Task cannot be its own parent.');
        abort_if(in_array($parent->id, $task->descendantIds($tasks), true), 422, 'Task cannot be reparented into a descendant.');

        $targetDepth = $this->depthFor($targetProject, $parent);
        $subtreeDepth = $this->subtreeDepth($task, $task->project_id === $targetProject->id ? $tasks : null);

        abort_if($targetDepth + 1 + $subtreeDepth > 2, 422, 'Maximum nesting depth reached.');

        return $parent;
    }

    public function reorder(Project $project, array $validated): void
    {
        $task = $project->tasks()->findOrFail($validated['task_id']);
        $targetTask = $project->tasks()->findOrFail($validated['target_task_id']);

        abort_if($task->id === $targetTask->id, 422, 'Task cannot be reordered against itself.');

        if ($validated['position'] === 'into') {
            $this->reparentTask($project, $task, $targetTask);

            return;
        }

        $this->moveTaskRelativeToSibling($project, $task, $targetTask, $validated['position']);
    }

    public function moveTaskSubtree(Task $task, string $oldProjectId, string $newProjectId): void
    {
        if ($oldProjectId === $newProjectId) {
            return;
        }

        $descendantIds = $task->descendantIds(Task::query()->where('project_id', $oldProjectId)->get(['id', 'parent_id']));

        if ($descendantIds === []) {
            return;
        }

        Task::query()
            ->whereIn('id', $descendantIds)
            ->update(['project_id' => $newProjectId]);
    }

    public function resequenceSiblings(string $projectId, ?string $parentId): void
    {
        $siblings = Task::query()
            ->where('project_id', $projectId)
            ->where('parent_id', $parentId)
            ->orderBy('sort_order')
            ->orderBy('start_date')
            ->orderBy('name')
            ->pluck('id')
            ->values();

        foreach ($siblings as $index => $taskId) {
            Task::query()
                ->where('id', $taskId)
                ->update(['sort_order' => $index + 1]);
        }
    }

    protected function depthFor(Project $project, Task $task): int
    {
        $depth = 0;
        $current = $task;

        while ($current->parent_id !== null) {
            $depth++;
            $current = $project->tasks()->findOrFail($current->parent_id);
        }

        return $depth;
    }

    protected function reparentTask(Project $project, Task $task, Task $targetTask): void
    {
        abort_if($task->isGroup(), 422, 'Groups cannot be nested.');

        $allTasks = $project->tasks()->get(['id', 'parent_id', 'sort_order']);

        abort_if(in_array($targetTask->id, $task->descendantIds($allTasks), true), 422, 'Task cannot be reparented into a descendant.');
        abort_if($task->parent_id === $targetTask->id, 422, 'Task is already a child of the target.');

        $targetDepth = $this->depthFor($project, $targetTask);
        $subtreeDepth = $this->subtreeDepth($task, $allTasks);

        abort_if($targetDepth + 1 + $subtreeDepth > 2, 422, 'Maximum nesting depth reached.');

        $task->update([
            'parent_id' => $targetTask->id,
            'sort_order' => $project->tasks()
                ->where('parent_id', $targetTask->id)
                ->max('sort_order') + 1,
        ]);
    }

    protected function moveTaskRelativeToSibling(Project $project, Task $task, Task $targetTask, string $position): void
    {
        $allTasks = $project->tasks()->get(['id', 'parent_id', 'sort_order']);
        $newParentId = $targetTask->parent_id;

        if ($task->isGroup() && $newParentId !== null) {
            abort(422, 'Groups must remain root-level tasks.');
        }

        abort_if(in_array($targetTask->id, $task->descendantIds($allTasks), true), 422, 'Task cannot be moved relative to a descendant.');

        if ($newParentId !== null) {
            $newParent = $project->tasks()->findOrFail($newParentId);
            $targetDepth = $this->depthFor($project, $newParent);
            $subtreeDepth = $this->subtreeDepth($task, $allTasks);

            abort_if($targetDepth + 1 + $subtreeDepth > 2, 422, 'Maximum nesting depth reached.');
        } else {
            abort_if($this->subtreeDepth($task, $allTasks) > 2, 422, 'Maximum nesting depth reached.');
        }

        $oldParentId = $task->parent_id;
        $targetSiblings = $project->tasks()
            ->where('parent_id', $newParentId)
            ->orderBy('sort_order')
            ->orderBy('start_date')
            ->orderBy('name')
            ->get(['id']);

        $orderedIds = $targetSiblings
            ->pluck('id')
            ->reject(fn (string $id): bool => $id === $task->id)
            ->values()
            ->all();
        $targetIndex = array_search($targetTask->id, $orderedIds, true);

        abort_if($targetIndex === false, 422, 'Unable to place task.');

        $insertAt = $position === 'before' ? $targetIndex : $targetIndex + 1;
        array_splice($orderedIds, $insertAt, 0, [$task->id]);

        DB::transaction(function () use ($orderedIds, $task, $newParentId, $oldParentId, $project): void {
            $task->update([
                'parent_id' => $newParentId,
            ]);

            foreach ($orderedIds as $index => $taskId) {
                Task::query()
                    ->where('id', $taskId)
                    ->update(['sort_order' => $index + 1]);
            }

            if ($oldParentId === $newParentId) {
                return;
            }

            $remainingSiblingIds = $project->tasks()
                ->where('parent_id', $oldParentId)
                ->orderBy('sort_order')
                ->orderBy('start_date')
                ->orderBy('name')
                ->pluck('id')
                ->values();

            foreach ($remainingSiblingIds as $index => $taskId) {
                Task::query()
                    ->where('id', $taskId)
                    ->update(['sort_order' => $index + 1]);
            }
        });
    }

    protected function subtreeDepth(Task $task, ?Collection $allTasks = null): int
    {
        $tasks = $allTasks ?? Task::query()
            ->where('project_id', $task->project_id)
            ->get(['id', 'parent_id', 'sort_order']);
        $childrenByParent = $tasks->groupBy('parent_id');
        $maxDepth = 0;
        $stack = [[$task->id, 0]];

        while ($stack !== []) {
            [$parentId, $depth] = array_pop($stack);
            $maxDepth = max($maxDepth, $depth);

            foreach ($childrenByParent->get($parentId, collect()) as $child) {
                $stack[] = [$child->id, $depth + 1];
            }
        }

        return $maxDepth;
    }
}
