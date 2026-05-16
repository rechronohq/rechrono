<?php

namespace App\Imports\Hive;

use JsonSerializable;

final readonly class HiveCsvImportResult implements JsonSerializable
{
    public function __construct(
        public array $rootProjectIds,
        public array $projectIds,
        public int $taskCount,
        public int $skippedRowCount,
        public array $matchedAssignees,
        public array $unmatchedAssigneeNames,
        public array $warnings,
    ) {}

    public function rootProjectCount(): int
    {
        return count($this->rootProjectIds);
    }

    public function subprojectCount(): int
    {
        return max(count($this->projectIds) - count($this->rootProjectIds), 0);
    }

    public function matchedAssigneeCount(): int
    {
        return count($this->matchedAssignees);
    }

    public function toArray(): array
    {
        return [
            'root_project_count' => $this->rootProjectCount(),
            'subproject_count' => $this->subprojectCount(),
            'task_count' => $this->taskCount,
            'skipped_row_count' => $this->skippedRowCount,
            'matched_assignee_count' => $this->matchedAssigneeCount(),
            'matched_assignees' => $this->matchedAssignees,
            'unmatched_assignee_names' => array_values($this->unmatchedAssigneeNames),
            'warnings' => array_values($this->warnings),
            'root_project_ids' => array_values($this->rootProjectIds),
            'project_ids' => array_values($this->projectIds),
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
