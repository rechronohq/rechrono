<?php

namespace App\Imports\Hive;

use Illuminate\Http\UploadedFile;
use InvalidArgumentException;

final class HiveCsvImportParser
{
    public const REQUIRED_HEADERS = [
        'Title',
        'Project',
    ];

    /**
     * @return array<int, HiveCsvRow>
     */
    public function parse(string|UploadedFile $source): array
    {
        return is_string($source) && is_file($source)
            ? $this->parseFromPath($source)
            : $this->parseFromContents($source instanceof UploadedFile ? file_get_contents($source->path()) ?: '' : $source);
    }

    /**
     * @return array<int, HiveCsvRow>
     */
    public function parseFromPath(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new InvalidArgumentException(sprintf('Unable to open CSV file at path: %s.', $path));
        }

        try {
            return $this->parseHandle($handle);
        } finally {
            fclose($handle);
        }
    }

    /**
     * @return array<int, HiveCsvRow>
     */
    public function parseFromContents(string $contents): array
    {
        $handle = fopen('php://temp', 'rb+');

        if ($handle === false) {
            throw new InvalidArgumentException('Unable to read CSV contents.');
        }

        try {
            fwrite($handle, $contents);
            rewind($handle);

            return $this->parseHandle($handle);
        } finally {
            fclose($handle);
        }
    }

    /**
     * @return array<int, HiveCsvRow>
     */
    protected function parseHandle($handle): array
    {
        $headers = null;
        $rows = [];

        while (($row = fgetcsv($handle, null, ',', '"', '')) !== false) {
            if ($this->isBlankRow($row)) {
                continue;
            }

            if ($headers === null) {
                $headers = $this->normalizeHeaders($row);
                $this->assertRequiredHeaders($headers);

                continue;
            }

            $rows[] = HiveCsvRow::fromCsvRow($this->combineRow($headers, $row));
        }

        if ($headers === null) {
            throw new InvalidArgumentException('The CSV file does not contain a header row.');
        }

        return $rows;
    }

    /**
     * @param  array<int, string|null>  $headers
     * @return array<string, string|null>
     */
    protected function combineRow(array $headers, array $row): array
    {
        $combined = [];
        $values = array_slice(array_pad($row, count($headers), null), 0, count($headers));

        foreach ($headers as $index => $header) {
            $combined[$header] = $values[$index] ?? null;
        }

        return $combined;
    }

    /**
     * @param  array<int, string|null>  $row
     * @return array<int, string>
     */
    protected function normalizeHeaders(array $row): array
    {
        $headers = array_map(
            static fn (mixed $value): string => HiveCsvRow::normalizeNullableString($value) ?? '',
            $row,
        );
        $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]) ?? $headers[0];

        return $headers;
    }

    /**
     * @param  array<int, string>  $headers
     */
    protected function assertRequiredHeaders(array $headers): void
    {
        $missing = array_values(array_diff(self::REQUIRED_HEADERS, $headers));

        if ($missing !== []) {
            throw new InvalidArgumentException(sprintf(
                'Missing required CSV headers: %s.',
                implode(', ', $missing),
            ));
        }
    }

    /**
     * @param  array<int, mixed>  $row
     */
    protected function isBlankRow(array $row): bool
    {
        foreach ($row as $value) {
            if (HiveCsvRow::normalizeNullableString($value) !== null) {
                return false;
            }
        }

        return true;
    }
}
