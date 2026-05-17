<?php

namespace App\Imports\Hive;

use App\Models\User;
use App\Models\Team;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;

final class HiveCsvImportPreviewService
{
    public function __construct(
        protected HiveCsvImportParser $parser,
    ) {}

    public function preview(string|UploadedFile $source, ?Team $team = null): HiveCsvPreview
    {
        $rows = $this->parser->parse($source);
        $validRows = [];
        $warnings = [];
        $skippedRowCount = 0;

        foreach ($rows as $index => $row) {
            foreach ($row->dateWarnings() as $dateWarning) {
                $warnings[] = $this->warningMessage($index, $row, $dateWarning);
            }

            $dateRange = $row->resolveDateRange();

            if (! $dateRange['is_valid']) {
                $skippedRowCount++;
                $warnings[] = $this->warningMessage($index, $row, $dateRange['warning']);

                continue;
            }

            $validRows[] = [
                'index' => $index,
                'row' => $row,
                'start' => $dateRange['start']?->toDateString(),
                'end' => $dateRange['end']?->toDateString(),
            ];
        }

        [$rootProjects, $subprojects, $structureWarnings] = $this->groupRows($validRows);
        $warnings = array_values(array_unique([
            ...$warnings,
            ...$structureWarnings,
            ...$this->resolveParentWarnings($validRows),
        ]));

        [$matchedAssignees, $unmatchedAssigneeNames] = $this->matchAssignees(collect($validRows)->pluck('row'), $team);

        return new HiveCsvPreview(
            rootProjects: $rootProjects,
            subprojects: $subprojects,
            taskCount: count($validRows),
            matchedAssignees: $matchedAssignees,
            unmatchedAssigneeNames: $unmatchedAssigneeNames,
            warnings: $warnings,
            skippedRowCount: $skippedRowCount,
        );
    }

    /**
     * @param  array<int, array{index: int, row: HiveCsvRow, start: ?string, end: ?string}>  $validRows
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>, 2: array<int, string>}
     */
    protected function groupRows(array $validRows): array
    {
        $rootProjects = [];
        $subprojects = [];
        $rootNames = [];
        $projectMap = [];
        $projectWarnings = [];

        foreach ($validRows as $entry) {
            $row = $entry['row'];
            $projectName = $row->projectName;

            $projectMap[$projectName] ??= [
                'index' => $entry['index'],
                'row' => $row,
                'name' => $projectName,
                'parent_project' => $row->parentProjectName,
                'task_count' => 0,
                'rows' => [],
            ];
            $projectMap[$projectName]['task_count']++;
            $projectMap[$projectName]['rows'][] = $this->summarizeRow($row, $entry['start'], $entry['end']);

            if ($row->parentProjectName === null) {
                $rootProjects[$projectName] ??= [
                    'name' => $projectName,
                    'task_count' => 0,
                    'rows' => [],
                ];
                $rootProjects[$projectName]['task_count']++;
                $rootProjects[$projectName]['rows'][] = $this->summarizeRow($row, $entry['start'], $entry['end']);
                $rootNames[$projectName] = true;

                continue;
            }

            $subprojects[$projectName] ??= [
                'name' => $projectName,
                'parent_project' => $row->parentProjectName,
                'task_count' => 0,
                'rows' => [],
            ];
            $subprojects[$projectName]['task_count']++;
            $subprojects[$projectName]['rows'][] = $this->summarizeRow($row, $entry['start'], $entry['end']);
        }

        foreach ($projectMap as $projectName => $group) {
            if ($group['parent_project'] !== null && ! isset($rootNames[$group['parent_project']])) {
                $projectWarnings[] = $this->warningMessage(
                    $group['index'],
                    $group['row'],
                    sprintf(
                        'Project "%s" references unresolved parent project "%s".',
                        $projectName,
                        $group['parent_project'],
                    ),
                );
            }
        }

        return [
            array_values($rootProjects),
            array_values($subprojects),
            array_values($projectWarnings),
        ];
    }

    /**
     * @param  array<int, array{index: int, row: HiveCsvRow, start: ?string, end: ?string}>  $validRows
     * @return array<int, string>
     */
    protected function resolveParentWarnings(array $validRows): array
    {
        $rowsByProject = collect($validRows)
            ->groupBy(fn (array $entry): string => $entry['row']->projectName);

        $warnings = [];

        foreach ($validRows as $entry) {
            $row = $entry['row'];
            $parentTaskId = $row->parentTaskId;
            $parentTaskName = $row->parentTaskName;

            if ($parentTaskId === null && $parentTaskName === null) {
                continue;
            }

            $projectRows = $rowsByProject->get($row->projectName, collect());
            $resolved = false;

            if ($parentTaskId !== null) {
                $resolved = $projectRows->contains(
                    fn (array $candidate): bool => $candidate['row']->hiveTaskId === $parentTaskId,
                );
            } elseif ($parentTaskName !== null) {
                $matches = $projectRows->filter(
                    fn (array $candidate): bool => $candidate['row']->title === $parentTaskName,
                );

                $resolved = $matches->count() === 1;
            }

            if ($resolved) {
                continue;
            }

            $warnings[] = $this->warningMessage(
                $entry['index'],
                $row,
                $parentTaskId !== null
                    ? sprintf('Unresolved parent task ID "%s".', $parentTaskId)
                    : sprintf('Unresolved parent task "%s".', $parentTaskName),
            );
        }

        return $warnings;
    }

    /**
     * @param  Collection<int, HiveCsvRow>  $rows
     * @return array{0: array<int, array{id: int, name: string}>, 1: array<int, string>}
     */
    protected function matchAssignees(Collection $rows, ?Team $team = null): array
    {
        $users = ($team ? $team->users() : User::query())
            ->orderBy('name')
            ->get(['id', 'name']);

        $usersByNormalizedName = $users->mapWithKeys(
            fn (User $user): array => [$this->normalizeName($user->name) => $user],
        );
        $matchedUsers = [];
        $unmatchedNames = [];

        foreach ($rows as $row) {
            foreach ($row->normalizeAssigneeTokens() as $token) {
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

    protected function summarizeRow(HiveCsvRow $row, ?string $start, ?string $end): array
    {
        return [
            'hive_task_id' => $row->hiveTaskId,
            'title' => $row->title,
            'project_name' => $row->projectName,
            'parent_project_name' => $row->parentProjectName,
            'parent_task_id' => $row->parentTaskId,
            'parent_task_name' => $row->parentTaskName,
            'status' => $row->status,
            'start_date' => $start,
            'end_date' => $end,
            'planned_start_date' => $row->plannedStartDate,
            'planned_end_date' => $row->plannedEndDate,
            'assignee_raw_string' => $row->assigneeRawString,
        ];
    }

    protected function normalizeName(string $value): string
    {
        $value = preg_replace('/\s+/', ' ', trim($value)) ?? $value;

        return mb_strtolower($value);
    }

    protected function warningMessage(int $index, HiveCsvRow $row, ?string $warning): string
    {
        $rowNumber = $index + 2;
        $prefix = sprintf('Row %d (%s):', $rowNumber, $row->title);

        return $warning
            ? sprintf('%s %s', $prefix, $warning)
            : sprintf('%s Invalid row.', $prefix);
    }
}
