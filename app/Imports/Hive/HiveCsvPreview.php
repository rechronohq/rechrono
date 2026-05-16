<?php

namespace App\Imports\Hive;

use JsonSerializable;

final readonly class HiveCsvPreview implements JsonSerializable
{
    public function __construct(
        public array $rootProjects,
        public array $subprojects,
        public int $taskCount,
        public array $matchedAssignees,
        public array $unmatchedAssigneeNames,
        public array $warnings,
        public int $skippedRowCount,
    ) {}

    public function rootProjectCount(): int
    {
        return count($this->rootProjects);
    }

    public function subprojectCount(): int
    {
        return count($this->subprojects);
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
            'matched_assignee_count' => $this->matchedAssigneeCount(),
            'matched_assignees' => $this->matchedAssignees,
            'unmatched_assignee_names' => array_values($this->unmatchedAssigneeNames),
            'skipped_row_count' => $this->skippedRowCount,
            'warnings' => array_values($this->warnings),
            'root_projects' => $this->rootProjects,
            'subprojects' => $this->subprojects,
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
