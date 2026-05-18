<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskService
{
    public function create(Team $team, Project $project, array $validated): Task
    {
        $kind = $validated['kind'] ?? Task::KIND_TASK;

        if ($kind === Task::KIND_GROUP) {
            $this->assertGroupPayloadIsValid($validated);
        } else {
            $dateErrors = [];

            if (! array_key_exists('start_date', $validated) || $validated['start_date'] === null) {
                $dateErrors['start_date'] = 'The start date field is required.';
            }

            if (! array_key_exists('end_date', $validated) || $validated['end_date'] === null) {
                $dateErrors['end_date'] = 'The end date field is required.';
            }

            if ($dateErrors !== []) {
                throw ValidationException::withMessages($dateErrors);
            }
        }

        $parent = null;

        if ($validated['parent_id'] ?? null) {
            $parent = $project->tasks()->findOrFail($validated['parent_id']);
            abort_if($this->depthFor($project, $parent) >= 2, 422, 'Maximum nesting depth reached.');
        }

        $assignment = $this->validatedAssignment($team, $validated);
        $dependency = ($validated['dependency_id'] ?? null) === null
            ? null
            : $project->tasks()->findOrFail($validated['dependency_id']);

        return $project->tasks()->create([
            'parent_id' => $parent?->id,
            'kind' => $kind,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'start_date' => $kind === Task::KIND_GROUP ? null : $validated['start_date'],
            'end_date' => $kind === Task::KIND_GROUP ? null : $validated['end_date'],
            'progress' => 0,
            'dependency_id' => $dependency?->id,
            'assignee_user_id' => $kind === Task::KIND_GROUP ? null : $assignment['assignee_user_id'],
            'completed' => false,
            'sort_order' => $project->tasks()
                ->where('parent_id', $parent?->id)
                ->max('sort_order') + 1,
        ]);
    }

    public function update(Team $team, Project $project, Task $task, array $validated): Project
    {
        abort_unless($task->project_id === $project->id, 404);

        $allTasks = $project->tasks()->get(['id', 'parent_id', 'progress', 'completed', 'dependency_id', 'project_id']);
        $originalStart = $task->start_date?->toDateString();
        $originalEnd = $task->end_date?->toDateString();
        $interaction = $validated['interaction'] ?? null;
        $oldProjectId = $task->project_id;
        $oldParentId = $task->parent_id;
        $oldAncestorIds = $task->ancestorIds($allTasks);
        $targetProject = array_key_exists('project_id', $validated)
            ? $team->projects()->findOrFail($validated['project_id'])
            : $project;
        $convertingToGroup = ! $task->isGroup() && ($validated['kind'] ?? null) === Task::KIND_GROUP;

        abort_if($task->isGroup() && ($validated['kind'] ?? null) === Task::KIND_TASK, 422, 'Groups cannot be converted to tasks.');

        $targetParent = $convertingToGroup
            ? null
            : $this->validatedParent(
                $validated,
                $targetProject,
                $task,
                $task->project_id === $targetProject->id ? $allTasks : null,
            );
        $structureChanged = $targetProject->id !== $task->project_id || $targetParent?->id !== $task->parent_id;

        if ($task->isGroup()) {
            $this->assertGroupPayloadIsValid($validated, true, $interaction);
        }

        $groupTimelineStart = $task->isGroup()
            ? $task->timelineDateRange($project->tasks()->get(['id', 'project_id', 'parent_id', 'start_date', 'end_date']))[0]?->toDateString()
            : null;

        if (array_key_exists('assignee_user_id', $validated)) {
            $validated = [
                ...$validated,
                ...$this->validatedAssignment($team, $validated, true, $task),
            ];
        }

        if ($structureChanged) {
            $validated['project_id'] = $targetProject->id;
            $validated['parent_id'] = $targetParent?->id;
            $validated['sort_order'] = $targetProject->tasks()
                ->where('parent_id', $targetParent?->id)
                ->where('id', '!=', $task->id)
                ->max('sort_order') + 1;
        }

        if (array_key_exists('dependency_id', $validated) || in_array($interaction, ['dependency_set', 'dependency_clear'], true)) {
            $dependency = $this->validatedDependency($validated, $project, $task, $allTasks);
            $validated['dependency_id'] = $dependency?->id;

            if ($interaction === 'dependency_set' && $dependency !== null) {
                $offset = CarbonImmutable::parse($originalStart)->diffInDays(
                    CarbonImmutable::parse($dependency->end_date->toDateString())->addDay(),
                    false,
                );
                $validated['start_date'] = CarbonImmutable::parse($originalStart)->addDays($offset)->toDateString();
                $validated['end_date'] = CarbonImmutable::parse($originalEnd)->addDays($offset)->toDateString();
            }
        }

        $effectiveStartDate = $validated['start_date'] ?? null;
        $effectiveEndDate = $validated['end_date'] ?? null;

        if ($task->isGroup() || $convertingToGroup) {
            $validated['parent_id'] = null;
            $validated['assignee_user_id'] = null;
            $validated['dependency_id'] = null;
            $validated['start_date'] = null;
            $validated['end_date'] = null;
            $validated['completed'] = false;
            $validated['progress'] = 0;
        }

        $task->fill($validated);

        if (array_key_exists('completed', $validated) && $validated['completed']) {
            $task->progress = 100;
        } elseif (array_key_exists('completed', $validated) && ! $validated['completed'] && $task->progress >= 100) {
            $task->progress = 99;
        }

        $task->save();

        if ($structureChanged) {
            $this->moveTaskSubtree($task, $oldProjectId, $targetProject->id);
            $this->normalizeDependenciesAfterMove($task, $oldProjectId, $targetProject->id);
            $this->resequenceSiblings($oldProjectId, $oldParentId);
            $this->resequenceSiblings($targetProject->id, $targetParent?->id);
        }

        if (in_array($interaction, ['move', 'dependency_set', 'dependency_clear'], true) && $effectiveStartDate && $effectiveEndDate) {
            $this->shiftDescendants($task, $task->isGroup() ? $groupTimelineStart : $originalStart, $effectiveStartDate);
        }

        if (array_key_exists('completed', $validated)) {
            $this->cascadeCompletionDown($task, $validated['completed']);
        }

        if ($convertingToGroup) {
            Task::query()
                ->where('dependency_id', $task->id)
                ->update(['dependency_id' => null]);
        }

        $this->syncAncestorCompletion($task, $allTasks);

        if ($structureChanged) {
            $this->syncAncestorChainsAfterMove($task, $oldProjectId, $oldAncestorIds);
        }

        return $targetProject;
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

    public function delete(Project $project, Task $task): void
    {
        abort_unless($task->project_id === $project->id, 404);

        if ($task->isGroup()) {
            DB::transaction(function () use ($project, $task): void {
                $nextRootSortOrder = (int) $project->tasks()->whereNull('parent_id')->max('sort_order');

                $children = $project->tasks()
                    ->where('parent_id', $task->id)
                    ->orderBy('sort_order')
                    ->get();

                foreach ($children as $index => $child) {
                    $child->update([
                        'parent_id' => null,
                        'sort_order' => $nextRootSortOrder + $index + 1,
                    ]);
                }

                Task::query()
                    ->where('dependency_id', $task->id)
                    ->update(['dependency_id' => null]);

                $task->delete();
                $this->resequenceSiblings($project->id, null);
            });

            return;
        }

        $taskIds = array_merge([$task->id], $task->descendantIds());

        DB::transaction(function () use ($taskIds): void {
            Task::query()
                ->whereIn('dependency_id', $taskIds)
                ->update(['dependency_id' => null]);

            Task::query()
                ->whereIn('id', $taskIds)
                ->delete();
        });
    }

    protected function validatedAssignment(Team $team, array $validated, bool $partial = false, ?Task $task = null): array
    {
        $assigneeUserId = array_key_exists('assignee_user_id', $validated)
            ? $validated['assignee_user_id']
            : ($partial ? $task?->assignee_user_id : null);

        if ($assigneeUserId === null) {
            return [
                'assignee_user_id' => null,
            ];
        }

        $team->users()->findOrFail($assigneeUserId);

        return [
            'assignee_user_id' => $assigneeUserId,
        ];
    }

    protected function validatedDependency(array $validated, Project $project, Task $task, Collection $allTasks): ?Task
    {
        $interaction = $validated['interaction'] ?? null;
        $dependencyId = array_key_exists('dependency_id', $validated) ? $validated['dependency_id'] : $task->dependency_id;

        if ($interaction === 'dependency_clear') {
            return null;
        }

        if ($interaction === 'dependency_set' && $dependencyId === null) {
            abort(422, 'Dependency target is required.');
        }

        if ($dependencyId === null) {
            return null;
        }

        $dependency = $project->tasks()->findOrFail($dependencyId);

        abort_if($dependency->id === $task->id, 422, 'Task cannot depend on itself.');
        abort_if(in_array($dependency->id, $task->descendantIds($allTasks), true), 422, 'Task cannot depend on a descendant.');
        abort_if(in_array($dependency->id, $task->ancestorIds($allTasks), true), 422, 'Task cannot depend on an ancestor.');
        abort_if($this->createsDependencyCycle($task, $dependency, $allTasks), 422, 'Dependency would create a cycle.');

        return $dependency;
    }

    protected function validatedParent(array $validated, Project $targetProject, Task $task, ?Collection $allTasks = null): ?Task
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

    protected function createsDependencyCycle(Task $task, Task $dependency, Collection $allTasks): bool
    {
        $tasksById = $allTasks->keyBy('id');
        $currentDependencyId = $dependency->dependency_id;

        while ($currentDependencyId !== null && $tasksById->has($currentDependencyId)) {
            if ($currentDependencyId === $task->id) {
                return true;
            }

            $currentDependencyId = $tasksById[$currentDependencyId]->dependency_id;
        }

        return false;
    }

    protected function moveTaskSubtree(Task $task, string $oldProjectId, string $newProjectId): void
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

    protected function normalizeDependenciesAfterMove(Task $task, string $oldProjectId, string $newProjectId): void
    {
        if ($oldProjectId === $newProjectId) {
            return;
        }

        $subtreeIds = array_merge([$task->id], $task->descendantIds(Task::query()->where('project_id', $newProjectId)->get(['id', 'parent_id'])));

        Task::query()
            ->whereIn('id', $subtreeIds)
            ->whereNotNull('dependency_id')
            ->whereNotIn('dependency_id', $subtreeIds)
            ->update(['dependency_id' => null]);

        Task::query()
            ->where('project_id', $oldProjectId)
            ->whereIn('dependency_id', $subtreeIds)
            ->update(['dependency_id' => null]);
    }

    protected function resequenceSiblings(string $projectId, ?string $parentId): void
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

    protected function syncAncestorChainsAfterMove(Task $task, string $oldProjectId, array $oldAncestorIds): void
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

    protected function shiftDescendants(Task $task, ?string $originalStart, string $newStart): void
    {
        if ($originalStart === null || $originalStart === $newStart) {
            return;
        }

        $offset = CarbonImmutable::parse($originalStart)->diffInDays(CarbonImmutable::parse($newStart), false);

        if ($offset === 0) {
            return;
        }

        $descendants = Task::query()
            ->whereIn('id', $task->descendantIds())
            ->get();

        foreach ($descendants as $descendant) {
            if ($descendant->start_date === null || $descendant->end_date === null) {
                continue;
            }

            $descendant->update([
                'start_date' => $descendant->start_date->copy()->addDays($offset),
                'end_date' => $descendant->end_date->copy()->addDays($offset),
            ]);
        }
    }

    protected function cascadeCompletionDown(Task $task, bool $completed): void
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

    protected function syncAncestorCompletion(Task $task, Collection $initialTasks): void
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

    protected function assertGroupPayloadIsValid(array $validated, bool $partial = false, ?string $interaction = null): void
    {
        $errors = [];
        $allowsDerivedDateMove = $interaction === 'move';

        if (($validated['parent_id'] ?? null) !== null) {
            $errors['parent_id'] = 'Groups must be root-level tasks.';
        }

        if (($validated['assignee_user_id'] ?? null) !== null) {
            $errors['assignee_user_id'] = 'Groups cannot be assigned.';
        }

        if (($validated['dependency_id'] ?? null) !== null) {
            $errors['dependency_id'] = 'Groups cannot have dependencies.';
        }

        if (! $allowsDerivedDateMove && ($validated['start_date'] ?? null) !== null) {
            $errors['start_date'] = 'Groups cannot have start dates.';
        }

        if (! $allowsDerivedDateMove && ($validated['end_date'] ?? null) !== null) {
            $errors['end_date'] = 'Groups cannot have end dates.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
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
