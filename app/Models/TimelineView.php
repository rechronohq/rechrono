<?php

namespace App\Models;

use Database\Factories\TimelineViewFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimelineView extends Model
{
    /** @use HasFactory<TimelineViewFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'team_id',
        'user_id',
        'name',
        'project_ids',
        'assignee_filters',
        'show_weekends',
        'timeline_density',
        'collapsed_project_ids',
    ];

    protected function casts(): array
    {
        return [
            'project_ids' => 'array',
            'assignee_filters' => 'array',
            'show_weekends' => 'boolean',
            'collapsed_project_ids' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
