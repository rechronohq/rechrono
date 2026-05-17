<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'team_id',
        'name',
        'description',
        'is_template',
        'is_active',
        'parent_id',
    ];

    protected function casts(): array
    {
        return [
            'is_template' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Project $project): void {
            $project->validateHierarchy();
        });

    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'parent_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function children(): HasMany
    {
        return $this->hasMany(Project::class, 'parent_id')->orderBy('name');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class)->orderBy('sort_order')->orderBy('start_date')->orderBy('name');
    }

    public function rootTasks(): HasMany
    {
        return $this->hasMany(Task::class)
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->orderBy('start_date')
            ->orderBy('name');
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function scopeTemplates(Builder $query): Builder
    {
        return $query->where('is_template', true);
    }

    public function scopePlannerVisible(Builder $query): Builder
    {
        return $query->where('is_template', false);
    }

    public function scopeTimelineVisible(Builder $query): Builder
    {
        return $query->plannerVisible()->active();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where(function (Builder $query): void {
            $query->where('is_active', true)
                ->orWhereNull('is_active');
        });
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('is_active', false);
    }

    public function scopeSubprojects(Builder $query): Builder
    {
        return $query->whereNotNull('parent_id');
    }

    public function validateHierarchy(): void
    {
        if ($this->parent_id === null) {
            return;
        }

        if ($this->exists && $this->parent_id === $this->id) {
            throw ValidationException::withMessages([
                'parent_id' => 'A project cannot be its own parent.',
            ]);
        }

        $parent = self::query()->find($this->parent_id);

        if (! $parent) {
            throw ValidationException::withMessages([
                'parent_id' => 'Selected parent project was not found.',
            ]);
        }

        if ($parent->parent_id !== null) {
            throw ValidationException::withMessages([
                'parent_id' => 'Subprojects cannot have subprojects.',
            ]);
        }

        if ($this->exists && $this->children()->exists()) {
            throw ValidationException::withMessages([
                'parent_id' => 'A project with subprojects cannot become a subproject.',
            ]);
        }
    }

    public static function orderedHierarchy(Collection $projects): Collection
    {
        $projects = $projects->sortBy('name')->values();
        $childrenByParent = $projects->whereNotNull('parent_id')->groupBy('parent_id');
        $ordered = collect();

        foreach ($projects->whereNull('parent_id') as $project) {
            $ordered->push($project);

            foreach ($childrenByParent->get($project->id, collect())->sortBy('name')->values() as $child) {
                $ordered->push($child);
            }
        }

        foreach ($projects->whereNotIn('id', $ordered->pluck('id')) as $project) {
            $ordered->push($project);
        }

        return $ordered->values();
    }

    public static function expandSelectedIds(Collection $projects, array $selectedIds): array
    {
        $selectedIds = collect($selectedIds)
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->values();

        if ($selectedIds->isEmpty()) {
            return [];
        }

        $selectedRootIds = $projects
            ->whereIn('id', $selectedIds)
            ->whereNull('parent_id')
            ->pluck('id');

        return collect([
            ...$selectedIds->all(),
            ...$projects->whereIn('parent_id', $selectedRootIds)->pluck('id')->all(),
        ])
            ->unique()
            ->values()
            ->all();
    }
}
