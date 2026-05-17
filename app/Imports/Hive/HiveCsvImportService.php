<?php

namespace App\Imports\Hive;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

final class HiveCsvImportService
{
    public function __construct(
        protected HiveCsvImportParser $parser,
        protected HiveCsvImportPreviewService $previewService,
    ) {}

    public function import(string|UploadedFile $source, ?Team $team = null): HiveCsvImportResult
    {
        $preview = $this->previewService->preview($source, $team);
        $rows = $this->parser->parse($source);

        return DB::transaction(function () use ($rows, $preview, $team): HiveCsvImportResult {
            $warnings = $this->previewWarningsForImport($preview);
            $entries = [];
            $additionalSkippedRowCount = 0;

            foreach ($rows as $index => $row) {
                $dateRange = $row->resolveDateRange();

                if (! $dateRange['is_valid']) {
                    continue;
                }

                $start = $dateRange['start']?->toDateString();
                $end = $dateRange['end']?->toDateString();

                if ($start === null || $end === null) {
                    $additionalSkippedRowCount++;
                    $warnings[] = $this->warningMessage($index, $row, 'Task has no importable dates.');

                    continue;
                }

                $entries[] = [
                    'index' => $index,
                    'row' => $row,
                    'start' => $start,
                    'end' => $end,
                ];
            }

            [$projectIdsByName, $rootProjectIds, $projectIds] = $this->createProjects($entries, $team);
            [$taskIdsByRowIndex, $taskIdsByProjectAndHiveId, $taskIdsByProjectAndTitle] = $this->createTasks(
                $entries,
                $projectIdsByName,
                $team,
            );

            $warnings = [
                ...$warnings,
                ...$this->linkTaskParents($entries, $taskIdsByRowIndex, $taskIdsByProjectAndHiveId, $taskIdsByProjectAndTitle),
            ];

            $this->resequenceTasks($entries, $taskIdsByRowIndex);
            [$matchedAssignees, $unmatchedAssigneeNames] = $this->matchAssignees($entries, $team);

            return new HiveCsvImportResult(
                rootProjectIds: $rootProjectIds,
                projectIds: $projectIds,
                taskCount: count($entries),
                skippedRowCount: $preview->skippedRowCount + $additionalSkippedRowCount,
                matchedAssignees: $matchedAssignees,
                unmatchedAssigneeNames: $unmatchedAssigneeNames,
                warnings: array_values(array_unique($warnings)),
            );
        });
    }

    /**
     * @param  array<int, array{index: int, row: HiveCsvRow, start: string, end: string}>  $entries
     * @return array{0: array<string, string>, 1: array<int, string>, 2: array<int, string>}
     */
    protected function createProjects(array $entries, ?Team $team = null): array
    {
        $definitions = [];

        foreach ($entries as $entry) {
            $row = $entry['row'];

            $definitions[$row->projectName] ??= [
                'name' => $row->projectName,
                'parent_project_name' => $row->parentProjectName,
                'index' => $entry['index'],
            ];
        }

        uasort(
            $definitions,
            static fn (array $left, array $right): int => $left['index'] <=> $right['index'],
        );

        $projectIdsByName = [];
        $rootProjectIds = [];
        $projectIds = [];

        foreach ($definitions as $definition) {
            $project = ($team ? $team->projects() : Project::query())->create([
                'name' => $definition['name'],
                'description' => null,
                'is_template' => false,
                'parent_id' => null,
            ]);

            $projectIdsByName[$definition['name']] = $project->id;
            $rootProjectIds[] = $project->id;
            $projectIds[] = $project->id;
        }

        return [$projectIdsByName, $rootProjectIds, $projectIds];
    }

    /**
     * @param  array<int, array{index: int, row: HiveCsvRow, start: string, end: string}>  $entries
     * @param  array<string, string>  $projectIdsByName
     * @return array{
     *     0: array<int, string>,
     *     1: array<string, array<string, string>>,
     *     2: array<string, array<string, array<int, string>>>
     * }
     */
    protected function createTasks(array $entries, array $projectIdsByName, ?Team $team = null): array
    {
        $usersByNormalizedName = ($team ? $team->users() : User::query())
            ->orderBy('name')
            ->get(['id', 'name'])
            ->mapWithKeys(fn (User $user): array => [$this->normalizeName($user->name) => $user]);

        $taskIdsByRowIndex = [];
        $taskIdsByProjectAndHiveId = [];
        $taskIdsByProjectAndTitle = [];
        $sortOrderByProject = [];

        foreach ($entries as $entry) {
            $row = $entry['row'];
            $projectId = $projectIdsByName[$row->projectName];
            $sortOrder = ($sortOrderByProject[$row->projectName] ?? 0) + 1;
            $sortOrderByProject[$row->projectName] = $sortOrder;
            $assignment = $this->resolveAssignment($row, $usersByNormalizedName->all());
            $completed = $this->isCompleted($row);

            $task = Task::query()->create([
                'project_id' => $projectId,
                'parent_id' => null,
                'name' => $row->title,
                'description' => null,
                'start_date' => $entry['start'],
                'end_date' => $entry['end'],
                'progress' => $completed ? 100 : 0,
                'dependency_id' => null,
                'assignee_user_id' => $assignment['assignee_user_id'],
                'completed' => $completed,
                'sort_order' => $sortOrder,
            ]);

            $taskIdsByRowIndex[$entry['index']] = $task->id;

            if ($row->hiveTaskId !== null) {
                $taskIdsByProjectAndHiveId[$row->projectName][$row->hiveTaskId] = $task->id;
            }

            $taskIdsByProjectAndTitle[$row->projectName][$row->title] ??= [];
            $taskIdsByProjectAndTitle[$row->projectName][$row->title][] = $task->id;
        }

        return [$taskIdsByRowIndex, $taskIdsByProjectAndHiveId, $taskIdsByProjectAndTitle];
    }

    /**
     * @param  array<int, array{index: int, row: HiveCsvRow, start: string, end: string}>  $entries
     * @param  array<int, string>  $taskIdsByRowIndex
     * @param  array<string, array<string, string>>  $taskIdsByProjectAndHiveId
     * @param  array<string, array<string, array<int, string>>>  $taskIdsByProjectAndTitle
     * @return array<int, string>
     */
    protected function linkTaskParents(
        array $entries,
        array $taskIdsByRowIndex,
        array $taskIdsByProjectAndHiveId,
        array $taskIdsByProjectAndTitle,
    ): array {
        $warnings = [];

        foreach ($entries as $entry) {
            $row = $entry['row'];
            $taskId = $taskIdsByRowIndex[$entry['index']];
            $parentId = $this->resolveParentTaskId($row, $taskId, $taskIdsByProjectAndHiveId, $taskIdsByProjectAndTitle);

            if ($parentId === null) {
                if ($row->parentTaskId !== null || $row->parentTaskName !== null) {
                    $warnings[] = $this->warningMessage(
                        $entry['index'],
                        $row,
                        $row->parentTaskId !== null
                            ? sprintf('Unresolved parent task ID "%s".', $row->parentTaskId)
                            : sprintf('Unresolved parent task "%s".', $row->parentTaskName),
                    );
                }

                continue;
            }

            Task::query()
                ->whereKey($taskId)
                ->update(['parent_id' => $parentId]);
        }

        return $warnings;
    }

    /**
     * @param  array<int, array{index: int, row: HiveCsvRow, start: string, end: string}>  $entries
     * @param  array<int, string>  $taskIdsByRowIndex
     */
    protected function resequenceTasks(array $entries, array $taskIdsByRowIndex): void
    {
        $groups = [];

        foreach ($entries as $entry) {
            $task = Task::query()->findOrFail($taskIdsByRowIndex[$entry['index']]);
            $groupKey = sprintf('%s:%s', $task->project_id, $task->parent_id ?? 'root');
            $groups[$groupKey][] = [
                'id' => $task->id,
                'index' => $entry['index'],
            ];
        }

        foreach ($groups as $group) {
            usort(
                $group,
                static fn (array $left, array $right): int => $left['index'] <=> $right['index'],
            );

            foreach (array_values($group) as $sortOrder => $taskData) {
                Task::query()
                    ->whereKey($taskData['id'])
                    ->update(['sort_order' => $sortOrder + 1]);
            }
        }
    }

    /**
     * @param  array<string, User>  $usersByNormalizedName
     * @return array{assignee_user_id: ?int}
     */
    protected function resolveAssignment(HiveCsvRow $row, array $usersByNormalizedName): array
    {
        foreach ($row->normalizeAssigneeTokens() as $token) {
            $normalizedToken = $this->normalizeName($token);

            if (! isset($usersByNormalizedName[$normalizedToken])) {
                continue;
            }

            return [
                'assignee_user_id' => $usersByNormalizedName[$normalizedToken]->id,
            ];
        }

        return [
            'assignee_user_id' => null,
        ];
    }

    /**
     * @param  array<int, array{index: int, row: HiveCsvRow, start: string, end: string}>  $entries
     * @return array{0: array<int, array{id: int, name: string}>, 1: array<int, string>}
     */
    protected function matchAssignees(array $entries, ?Team $team = null): array
    {
        $usersByNormalizedName = ($team ? $team->users() : User::query())
            ->orderBy('name')
            ->get(['id', 'name'])
            ->mapWithKeys(fn (User $user): array => [$this->normalizeName($user->name) => $user]);
        $matchedUsers = [];
        $unmatchedNames = [];

        foreach ($entries as $entry) {
            foreach ($entry['row']->normalizeAssigneeTokens() as $token) {
                $normalizedToken = $this->normalizeName($token);

                if ($usersByNormalizedName->has($normalizedToken)) {
                    /** @var User $user */
                    $user = $usersByNormalizedName->get($normalizedToken);
                    $matchedUsers[$user->id] = [
                        'id' => $user->id,
                        'name' => $user->name,
                    ];

                    continue;
                }

                $unmatchedNames[$normalizedToken] = $token;
            }
        }

        return [
            array_values($matchedUsers),
            array_values($unmatchedNames),
        ];
    }

    /**
     * @param  array<string, array<string, string>>  $taskIdsByProjectAndHiveId
     * @param  array<string, array<string, array<int, string>>>  $taskIdsByProjectAndTitle
     */
    protected function resolveParentTaskId(
        HiveCsvRow $row,
        string $taskId,
        array $taskIdsByProjectAndHiveId,
        array $taskIdsByProjectAndTitle,
    ): ?string {
        $parentId = null;

        if ($row->parentTaskId !== null) {
            $parentId = $taskIdsByProjectAndHiveId[$row->projectName][$row->parentTaskId] ?? null;
        }

        if ($parentId === null && $row->parentTaskName !== null) {
            $matches = $taskIdsByProjectAndTitle[$row->projectName][$row->parentTaskName] ?? [];

            if (count($matches) === 1) {
                $parentId = $matches[0];
            }
        }

        if ($parentId === $taskId) {
            return null;
        }

        return $parentId;
    }

    protected function isCompleted(HiveCsvRow $row): bool
    {
        return $row->status !== null && strtolower($row->status) === 'completed';
    }

    protected function normalizeName(string $value): string
    {
        $value = preg_replace('/\s+/', ' ', trim($value)) ?? $value;

        return mb_strtolower($value);
    }

    protected function warningMessage(int $index, HiveCsvRow $row, string $warning): string
    {
        return sprintf('Row %d (%s): %s', $index + 2, $row->title, $warning);
    }

    /**
     * @return array<int, string>
     */
    protected function previewWarningsForImport(HiveCsvPreview $preview): array
    {
        return array_values(array_filter(
            $preview->warnings,
            static fn (string $warning): bool => ! str_contains($warning, 'Unresolved parent task')
                && ! str_contains($warning, 'references unresolved parent project'),
        ));
    }
}
