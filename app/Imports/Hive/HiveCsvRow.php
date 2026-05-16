<?php

namespace App\Imports\Hive;

use Carbon\CarbonImmutable;

final readonly class HiveCsvRow
{
    public function __construct(
        public ?string $hiveTaskId,
        public string $title,
        public string $projectName,
        public ?string $parentProjectName,
        public ?string $parentTaskId,
        public ?string $parentTaskName,
        public ?string $status,
        public ?string $startDate,
        public ?string $dueDate,
        public ?string $plannedStartDate,
        public ?string $plannedEndDate,
        public ?string $assigneeRawString,
    ) {}

    public static function fromCsvRow(array $row): self
    {
        return new self(
            self::normalizeNullableString($row['ID'] ?? null),
            self::normalizeRequiredString($row['Title'] ?? null, 'Title'),
            self::normalizeRequiredString($row['Project'] ?? null, 'Project'),
            self::normalizeNullableString($row['Parent project'] ?? null),
            self::normalizeNullableString($row['Parent ID'] ?? null),
            self::normalizeNullableString($row['Parent'] ?? null),
            self::normalizeNullableString($row['Status'] ?? null),
            self::normalizeNullableString($row['Start date'] ?? null),
            self::normalizeNullableString($row['Due date'] ?? null),
            self::normalizeNullableString($row['Planned start date'] ?? null),
            self::normalizeNullableString($row['Planned end date'] ?? null),
            self::normalizeNullableString($row['Assignees'] ?? null),
        );
    }

    public function normalizeAssigneeTokens(): array
    {
        if ($this->assigneeRawString === null) {
            return [];
        }

        $tokens = preg_split('/[,\n;|]+/', $this->assigneeRawString, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_filter(array_map(
            static fn (string $token): ?string => self::normalizeToken($token),
            $tokens,
        )));
    }

    public function resolveDateRange(): array
    {
        $actualStart = $this->parseDate($this->startDate);
        $actualEnd = $this->parseDate($this->dueDate);
        $plannedStart = $this->parseDate($this->plannedStartDate);
        $plannedEnd = $this->parseDate($this->plannedEndDate);

        foreach ([[$actualStart, $actualEnd], [$plannedStart, $plannedEnd]] as [$start, $end]) {
            $resolved = $this->resolveDatePair($start, $end);

            if ($resolved !== null) {
                return $resolved;
            }
        }

        return [
            'start' => null,
            'end' => null,
            'is_valid' => true,
            'warning' => null,
        ];
    }

    /**
     * @return array{start: ?CarbonImmutable, end: ?CarbonImmutable, is_valid: bool, warning: ?string}|null
     */
    private function resolveDatePair(?CarbonImmutable $start, ?CarbonImmutable $end): ?array
    {
        if ($start === null && $end === null) {
            return null;
        }

        if ($start !== null && $end === null) {
            $end = $start;
        }

        if ($end !== null && $start === null) {
            $start = $end;
        }

        if ($start !== null && $end !== null && $end->lt($start)) {
            return [
                'start' => $start,
                'end' => $end,
                'is_valid' => false,
                'warning' => 'End date is earlier than start date.',
            ];
        }

        return [
            'start' => $start,
            'end' => $end,
            'is_valid' => true,
            'warning' => null,
        ];
    }

    /**
     * @return array<int, string>
     */
    public function dateWarnings(): array
    {
        $warnings = [];

        foreach ([
            'Start date' => $this->startDate,
            'Due date' => $this->dueDate,
            'Planned start date' => $this->plannedStartDate,
            'Planned end date' => $this->plannedEndDate,
        ] as $fieldName => $value) {
            if ($value === null) {
                continue;
            }

            if ($this->parseDate($value) === null) {
                $warnings[] = sprintf('Invalid %s value "%s".', $fieldName, $value);
            }
        }

        return $warnings;
    }

    public static function normalizeNullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    public static function normalizeRequiredString(mixed $value, string $fieldName): string
    {
        $normalized = self::normalizeNullableString($value);

        if ($normalized === null) {
            throw new \InvalidArgumentException(sprintf('Missing required CSV field: %s.', $fieldName));
        }

        return $normalized;
    }

    public static function normalizeToken(string $value): ?string
    {
        $value = preg_replace('/\s+/', ' ', trim($value)) ?? '';

        if ($value === '') {
            return null;
        }

        if (strtolower($value) === 'unassigned') {
            return null;
        }

        return $value;
    }

    private function parseDate(?string $value): ?CarbonImmutable
    {
        if ($value === null) {
            return null;
        }

        try {
            return CarbonImmutable::parse($value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
