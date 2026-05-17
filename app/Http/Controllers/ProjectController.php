<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Support\TimelinePayloadBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    public function __construct(
        protected TimelinePayloadBuilder $timelinePayloadBuilder,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', 'exists:projects,id'],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
        ])->validate();

        $parent = $this->validatedParentProject($team, $validated['parent_id'] ?? null);

        $project = $team->projects()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_template' => false,
            'parent_id' => $parent?->id,
        ]);

        $allProjects = $this->allVisibleProjects($team);
        $selectedProjectIds = collect($validated['selected_project_ids'] ?? [])
            ->push($project->id)
            ->unique()
            ->values()
            ->all();
        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds);

        $selectedProjects = $allProjects
            ->whereIn('id', $visibleProjectIds)
            ->values();

        return response()->json([
            ...$this->timelinePayload($request, $selectedProjects, $allProjects, $selectedProjectIds),
            'project' => [
                'id' => $project->id,
                'show_url' => route('projects.show', [$team, $project]),
            ],
        ]);
    }

    public function update(Request $request, Team $team, Project $project): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', 'exists:projects,id'],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
        ])->validate();

        $parent = $this->validatedParentProject($team, $validated['parent_id'] ?? null, $project);

        $project->update([
            'name' => $validated['name'],
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $project->description,
            'parent_id' => $parent?->id,
        ]);

        $project = $project->fresh();

        return response()->json([
            ...$this->timelinePayloadForRequest($request, $project),
            'project' => [
                'id' => $project->id,
                'show_url' => route('projects.show', [$team, $project]),
            ],
        ]);
    }

    public function duplicate(Request $request, Team $team, Project $project): JsonResponse
    {
        DB::transaction(function () use ($project): void {
            $this->duplicateProjectTree($project, [
                'forced_parent_id' => $project->parent_id,
            ]);
        });

        return response()->json($this->timelinePayloadForRequest($request, $project->fresh()));
    }

    public function saveAsTemplate(Request $request, Team $team, Project $project): JsonResponse
    {
        abort_if($project->is_template, 422, 'Templates cannot be converted into templates again.');

        DB::transaction(function () use ($team, $project): void {
            $this->duplicateProjectTree($project, [
                'name' => $this->duplicateName($project->name, $team->projects()->pluck('name')->all(), 'Template'),
                'is_template' => true,
                'clear_assignees' => true,
                'reset_completion' => true,
            ]);
        });

        return response()->json($this->timelinePayloadForRequest($request, $project->fresh()));
    }

    public function storeFromTemplate(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = Validator::make($request->all(), [
            'template_project_id' => ['required', 'uuid', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', 'exists:projects,id'],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
            'collapsed_project_ids' => ['nullable', 'array'],
            'collapsed_project_ids.*' => ['string'],
        ])->validate();

        /** @var Project $template */
        $template = $team->projects()->findOrFail($validated['template_project_id']);
        abort_unless($template->is_template, 422, 'Selected project is not a template.');

        $parent = $this->validatedParentProject($team, $validated['parent_id'] ?? null);
        $project = DB::transaction(function () use ($template, $validated, $parent): Project {
            return $this->duplicateProjectTree($template, [
                'name' => $validated['name'],
                'forced_parent_id' => $parent?->id,
                'is_template' => false,
                'clear_assignees' => true,
                'reset_completion' => true,
                'preserve_names' => true,
            ]);
        });

        $allProjects = $this->allVisibleProjects($team);
        $selectedProjectIds = collect($validated['selected_project_ids'] ?? [])
            ->push($project->id)
            ->unique()
            ->values()
            ->all();
        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds);
        $selectedProjects = $allProjects->whereIn('id', $visibleProjectIds)->values();

        return response()->json(
            [
                ...$this->timelinePayload($request, $selectedProjects, $allProjects, $selectedProjectIds),
                'project' => [
                    'id' => $project->id,
                    'show_url' => route('projects.show', [$team, $project]),
                ],
            ],
        );
    }

    public function destroy(Request $request, Team $team, Project $project): JsonResponse
    {
        $this->deleteProjectTrees($team, [$project->id]);

        return response()->json($this->timelinePayloadForRequest($request));
    }

    public function bulkAction(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $validated = $request->validate([
            'action' => ['required', 'in:archive,unarchive,change-parent,delete'],
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['uuid', 'exists:projects,id'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
        ]);

        if ($validated['action'] === 'delete') {
            $this->deleteProjectTrees($team, $validated['project_ids']);

            return response()->json(['ok' => true]);
        }

        if ($validated['action'] === 'change-parent') {
            $this->bulkChangeParent($team, $validated['project_ids'], $validated['parent_id'] ?? null);

            return response()->json(['ok' => true]);
        }

        $team->projects()
            ->whereIn('id', $validated['project_ids'])
            ->update([
                'is_active' => $validated['action'] === 'unarchive',
                'updated_at' => now(),
            ]);

        return response()->json(['ok' => true]);
    }

    protected function validatedParentProject(Team $team, ?string $parentId, ?Project $project = null): ?Project
    {
        if ($parentId === null) {
            return null;
        }

        $parent = $team->projects()->findOrFail($parentId);

        if ($project && $parent->id === $project->id) {
            abort(422, 'A project cannot be its own parent.');
        }

        abort_if($parent->is_template, 422, 'Template projects cannot be selected as parents.');
        abort_if($parent->parent_id !== null, 422, 'Subprojects cannot have subprojects.');
        abort_if($project && $project->children()->exists(), 422, 'A project with subprojects cannot become a subproject.');

        return $parent;
    }

    protected function bulkChangeParent(Team $team, array $projectIds, ?string $parentId): void
    {
        if ($parentId !== null && in_array($parentId, $projectIds, true)) {
            abort(422, 'Selected projects cannot be moved under another selected project.');
        }

        /** @var Collection<int, Project> $projects */
        $projects = $team->projects()
            ->whereIn('id', $projectIds)
            ->get();

        $parent = null;

        if ($parentId !== null) {
            $parent = $this->validatedParentProject($team, $parentId);

            foreach ($projects as $project) {
                $this->validatedParentProject($team, $parentId, $project);
            }
        }

        $team->projects()
            ->whereIn('id', $projectIds)
            ->update([
                'parent_id' => $parent?->id,
                'updated_at' => now(),
            ]);
    }

    protected function deleteProjectTrees(Team $team, array $rootProjectIds): void
    {
        DB::transaction(function () use ($team, $rootProjectIds): void {
            $projects = $team->projects()->get(['id', 'parent_id']);
            $projectIds = collect($rootProjectIds)
                ->flatMap(function (string $projectId) use ($projects): array {
                    /** @var Project|null $project */
                    $project = $projects->firstWhere('id', $projectId);

                    if (! $project) {
                        return [];
                    }

                    return array_merge([$project->id], $this->descendantProjectIds($project, $projects));
                })
                ->unique()
                ->values()
                ->all();

            $taskIds = Task::query()
                ->whereIn('project_id', $projectIds)
                ->pluck('id')
                ->all();

            Task::query()
                ->whereIn('dependency_id', $taskIds)
                ->update(['dependency_id' => null]);

            Task::query()->whereIn('project_id', $projectIds)->delete();
            $team->projects()->whereIn('id', $projectIds)->delete();
        });
    }

    protected function duplicateProjectTree(Project $sourceProject, array $options = []): Project
    {
        $projectCopy = Project::query()->create([
            'team_id' => $sourceProject->team_id,
            'name' => $options['name'] ?? (
                ($options['preserve_names'] ?? false)
                    ? $sourceProject->name
                    : $this->duplicateName($sourceProject->name, Project::query()->where('team_id', $sourceProject->team_id)->pluck('name')->all())
            ),
            'description' => $sourceProject->description,
            'is_template' => $options['is_template'] ?? $sourceProject->is_template,
            'parent_id' => $options['forced_parent_id'] ?? $sourceProject->parent_id,
        ]);

        $tasks = Task::query()
            ->where('project_id', $sourceProject->id)
            ->orderBy('sort_order')
            ->orderBy('start_date')
            ->orderBy('name')
            ->get();
        $taskMap = [];

        foreach ($tasks->whereNull('parent_id') as $rootTask) {
            $this->duplicateTaskTree($rootTask, $projectCopy->id, null, $taskMap, $options);
        }

        foreach ($tasks as $task) {
            if ($task->dependency_id !== null && isset($taskMap[$task->id], $taskMap[$task->dependency_id])) {
                Task::query()
                    ->where('id', $taskMap[$task->id])
                    ->update(['dependency_id' => $taskMap[$task->dependency_id]]);
            }
        }

        foreach ($sourceProject->children as $childProject) {
            $this->duplicateProjectTree($childProject, [
                ...$options,
                'forced_parent_id' => $projectCopy->id,
            ]);
        }

        return $projectCopy;
    }

    protected function duplicateTaskTree(Task $sourceTask, string $projectId, ?string $parentId, array &$taskMap, array $options = []): Task
    {
        $clearAssignees = $options['clear_assignees'] ?? false;
        $resetCompletion = $options['reset_completion'] ?? false;
        $dateShiftDays = $options['date_shift_days'] ?? null;

        $copy = Task::query()->create([
            'project_id' => $projectId,
            'parent_id' => $parentId,
            'name' => ($options['preserve_names'] ?? false)
                ? $sourceTask->name
                : $this->duplicateName(
                    $sourceTask->name,
                    Task::query()->where('project_id', $projectId)->pluck('name')->all(),
                ),
            'description' => $sourceTask->description,
            'start_date' => $dateShiftDays === null ? $sourceTask->start_date : $sourceTask->start_date?->copy()->addDays($dateShiftDays),
            'end_date' => $dateShiftDays === null ? $sourceTask->end_date : $sourceTask->end_date?->copy()->addDays($dateShiftDays),
            'progress' => $resetCompletion ? 0 : $sourceTask->progress,
            'assignee_user_id' => $sourceTask->assignee_user_id,
            'completed' => $resetCompletion ? false : $sourceTask->completed,
            'sort_order' => Task::query()
                ->where('project_id', $projectId)
                ->where('parent_id', $parentId)
                ->max('sort_order') + 1,
        ]);

        if ($clearAssignees) {
            $copy->forceFill([
                'assignee_user_id' => null,
            ])->saveQuietly();
        }

        $taskMap[$sourceTask->id] = $copy->id;

        foreach ($sourceTask->children as $child) {
            $this->duplicateTaskTree($child, $projectId, $copy->id, $taskMap, $options);
        }

        return $copy;
    }

    protected function descendantProjectIds(Project $project, Collection $projects): array
    {
        $childrenByParent = $projects->groupBy('parent_id');
        $stack = [$project->id];
        $descendants = [];

        while ($stack !== []) {
            $parentId = array_pop($stack);

            foreach ($childrenByParent->get($parentId, collect()) as $child) {
                $descendants[] = $child->id;
                $stack[] = $child->id;
            }
        }

        return $descendants;
    }

    protected function duplicateName(string $baseName, array $existingNames, string $suffixLabel = 'Copy'): string
    {
        $candidate = sprintf('%s %s', $baseName, $suffixLabel);
        $suffix = 2;

        while (in_array($candidate, $existingNames, true)) {
            $candidate = sprintf('%s %s %d', $baseName, $suffixLabel, $suffix);
            $suffix++;
        }

        return $candidate;
    }

    protected function timelinePayloadForRequest(Request $request, ?Project $fallbackProject = null): array
    {
        $team = $this->currentTeam($request);
        $allProjects = $this->allVisibleProjects($team);
        $selectedProjectIds = collect($request->input('selected_project_ids', []))
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->intersect($allProjects->pluck('id'))
            ->values();

        if ($selectedProjectIds->isEmpty() && $fallbackProject) {
            $selectedProjectIds = collect([$fallbackProject->id]);
        }

        $visibleProjectIds = Project::expandSelectedIds($allProjects, $selectedProjectIds->all());
        $selectedProjects = $allProjects->whereIn('id', $visibleProjectIds)->values();

        if ($selectedProjects->isEmpty()) {
            $selectedProjects = $allProjects->take(min(1, $allProjects->count()))->values();
            $selectedProjectIds = $selectedProjects->pluck('id');
        }

        return $this->timelinePayload($request, $selectedProjects, $allProjects, $selectedProjectIds->all());
    }

    protected function timelinePayload(Request $request, Collection $selectedProjects, Collection $allProjects, array $selectedProjectIds): array
    {
        return $this->timelinePayloadBuilder->build(
            $selectedProjects,
            $allProjects,
            $selectedProjectIds,
            $request->input('selected_assignee_filters', []),
            $request->boolean('show_weekends', false),
            collect($request->input('collapsed_project_ids', []))
                ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
                ->all(),
            team: $this->currentTeam($request),
        );
    }

    protected function allVisibleProjects(Team $team): Collection
    {
        return $team->projects()
            ->timelineVisible()
            ->get();
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
