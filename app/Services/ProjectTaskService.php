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
    public function __construct(
        protected ProjectTaskCompletionService $completionService,
        protected ProjectTaskDuplicationService $duplicationService,
        protected ProjectTaskStructureService $structureService,
    ) {}

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

        $parent = $this->structureService->parentForCreate($project, $validated['parent_id'] ?? null);
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
        $timelineDeltaDays = $validated['timeline_delta_days'] ?? null;
        $showWeekends = $validated['show_weekends'] ?? true;
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
            : $this->structureService->validatedParent(
                $validated,
                $targetProject,
                $task,
                $task->project_id === $targetProject->id ? $allTasks : null,
            );
        $structureChanged = $targetProject->id !== $task->project_id || $targetParent?->id !== $task->parent_id;

        if ($task->isGroup()) {
            $this->assertGroupPayloadIsValid($validated, true, $interaction);
        }

        $summaryTimelineStart = $task->timelineDateRange(
            $project->tasks()->get(['id', 'project_id', 'parent_id', 'start_date', 'end_date'])
        )[0]?->toDateString();

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
            $this->structureService->moveTaskSubtree($task, $oldProjectId, $targetProject->id);
            $this->normalizeDependenciesAfterMove($task, $oldProjectId, $targetProject->id);
            $this->structureService->resequenceSiblings($oldProjectId, $oldParentId);
            $this->structureService->resequenceSiblings($targetProject->id, $targetParent?->id);
        }

        if (in_array($interaction, ['move', 'dependency_set', 'dependency_clear'], true) && $effectiveStartDate && $effectiveEndDate) {
            if ($interaction === 'move' && $timelineDeltaDays !== null) {
                $this->shiftDescendantsByTimelineDays($task, (int) $timelineDeltaDays, (bool) $showWeekends);
            } else {
                $this->shiftDescendants($task, $summaryTimelineStart ?? $originalStart, $effectiveStartDate);
            }
        }

        if (array_key_exists('completed', $validated)) {
            $this->completionService->cascadeCompletionDown($task, $validated['completed']);
        }

        if ($convertingToGroup) {
            Task::query()
                ->where('dependency_id', $task->id)
                ->update(['dependency_id' => null]);
        }

        $this->completionService->syncAncestorCompletion($task, $allTasks);

        if ($structureChanged) {
            $this->completionService->syncAncestorChainsAfterMove($task, $oldProjectId, $oldAncestorIds);
        }

        return $targetProject;
    }

    public function reorder(Project $project, array $validated): void
    {
        $this->structureService->reorder($project, $validated);
    }

    public function duplicate(Project $project, Task $task): Task
    {
        return $this->duplicationService->duplicate($project, $task);
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
                $this->structureService->resequenceSiblings($project->id, null);
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

    protected function shiftDescendantsByTimelineDays(Task $task, int $days, bool $showWeekends): void
    {
        if ($days === 0) {
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
                'start_date' => $this->shiftTimelineDate($descendant->start_date->toDateString(), $days, $showWeekends),
                'end_date' => $this->shiftTimelineDate($descendant->end_date->toDateString(), $days, $showWeekends),
            ]);
        }
    }

    protected function shiftTimelineDate(string $date, int $days, bool $showWeekends): string
    {
        $next = CarbonImmutable::parse($date);

        if ($showWeekends) {
            return $next->addDays($days)->toDateString();
        }

        $direction = $days > 0 ? 1 : -1;
        $remaining = abs($days);

        while ($remaining > 0) {
            $next = $next->addDays($direction);

            if (! $next->isWeekend()) {
                $remaining--;
            }
        }

        return $next->toDateString();
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
}
