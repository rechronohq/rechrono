<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\TimeEntryFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    /** @use HasFactory<TimeEntryFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'team_id',
        'project_id',
        'task_id',
        'user_id',
        'started_at',
        'ended_at',
        'duration_seconds',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_seconds' => 'integer',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isRunning(): bool
    {
        return $this->ended_at === null;
    }

    public function secondsAt(?CarbonInterface $now = null): int
    {
        if (! $this->isRunning()) {
            return $this->duration_seconds;
        }

        $now ??= now();

        return max(0, (int) $this->started_at->diffInSeconds($now));
    }

    public function toPayload(?CarbonInterface $now = null): array
    {
        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'project_id' => $this->project_id,
            'project_name' => $this->project?->name,
            'task_id' => $this->task_id,
            'task_name' => $this->task?->name,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'started_at' => $this->started_at?->toJSON(),
            'ended_at' => $this->ended_at?->toJSON(),
            'date' => $this->started_at?->toDateString(),
            'started_time' => $this->started_at?->format('H:i'),
            'ended_time' => $this->ended_at?->format('H:i'),
            'duration_seconds' => $this->secondsAt($now),
            'duration_hours' => round($this->secondsAt($now) / 3600, 2),
            'hours' => round($this->secondsAt($now) / 3600, 2),
            'is_running' => $this->isRunning(),
        ];
    }
}
