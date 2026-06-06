<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\ValidationException;

class Task extends Model
{
    public const KIND_TASK = 'task';

    public const KIND_GROUP = 'group';

    /** @use HasFactory<TaskFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'parent_id',
        'kind',
        'name',
        'description',
        'start_date',
        'end_date',
        'progress',
        'dependency_id',
        'assignee_user_id',
        'completed',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'completed' => 'boolean',
            'progress' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order')->orderBy('start_date')->orderBy('name');
    }

    public function dependency(): BelongsTo
    {
        return $this->belongsTo(self::class, 'dependency_id');
    }

    public function assigneeUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_user_id');
    }

    public function dependents(): HasMany
    {
        return $this->hasMany(self::class, 'dependency_id');
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function hasChildren(): bool
    {
        return $this->relationLoaded('children')
            ? $this->children->isNotEmpty()
            : $this->children()->exists();
    }

    public function isGroup(): bool
    {
        return $this->kind === self::KIND_GROUP;
    }

    public function isTask(): bool
    {
        return $this->kind === self::KIND_TASK;
    }

    public function toTimelinePayload(int $depth = 0, ?Collection $allTasks = null): array
    {
        [$startDate, $endDate] = $this->timelineDateRange($allTasks);

        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'project_name' => $this->project?->name,
            'name' => $this->name,
            'description' => $this->description,
            'start' => $startDate?->toDateString(),
            'end' => $endDate?->toDateString(),
            'completed' => $this->completed,
            'kind' => $this->kind,
            'parent_id' => $this->parent_id,
            'dependency_id' => $this->dependency_id,
            'dependency_name' => $this->dependency?->name,
            'has_dependency' => $this->dependency_id !== null,
            'assignee_user_id' => $this->assignee_user_id,
            'assignee_name' => $this->assigneeLabel(),
            'depth' => $depth,
            'has_children' => $this->hasChildren(),
            'sort_order' => $this->sort_order,
        ];
    }

    /**
     * @return array{0: CarbonInterface|null, 1: CarbonInterface|null}
     */
    public function timelineDateRange(?Collection $allTasks = null): array
    {
        $tasks = $allTasks ?? static::query()
            ->where('project_id', $this->project_id)
            ->get(['id', 'parent_id', 'start_date', 'end_date']);
        $primaryChild = $tasks
            ->where('parent_id', $this->id);

        if ($primaryChild->isEmpty()) {
            return $this->isGroup() ? [null, null] : [$this->start_date, $this->end_date];
        }

        $descendantIds = [];

        foreach ($primaryChild as $child) {
            $descendantIds[] = $child->id;
            $descendantIds = array_merge($descendantIds, $child->descendantIds($tasks));
        }

        $startDate = null;
        $endDate = null;

        foreach ($tasks->whereIn('id', $descendantIds) as $task) {
            if ($task->start_date === null || $task->end_date === null) {
                continue;
            }

            if ($startDate === null || $task->start_date->lt($startDate)) {
                $startDate = $task->start_date->copy();
            }

            if ($endDate === null || $task->end_date->gt($endDate)) {
                $endDate = $task->end_date->copy();
            }
        }

        if ($startDate === null || $endDate === null) {
            return $this->isGroup() ? [null, null] : [$this->start_date, $this->end_date];
        }

        return [$startDate, $endDate];
    }

    public function assigneeLabel(): ?string
    {
        return $this->assigneeUser?->name;
    }

    public function descendantIds(?Collection $allTasks = null): array
    {
        $tasks = $allTasks ?? static::query()
            ->where('project_id', $this->project_id)
            ->get(['id', 'parent_id']);

        $childrenByParent = $tasks->groupBy('parent_id');
        $stack = [$this->id];
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

    public function descendantsAndSelf(?Collection $allTasks = null): Collection
    {
        $tasks = $allTasks ?? static::query()
            ->where('project_id', $this->project_id)
            ->get();
        $ids = array_merge([$this->id], $this->descendantIds($tasks));

        return $tasks->whereIn('id', $ids)->values();
    }

    public function ancestorIds(?Collection $allTasks = null): array
    {
        $tasks = ($allTasks ?? static::query()
            ->where('project_id', $this->project_id)
            ->get(['id', 'parent_id']))
            ->keyBy('id');

        $ancestors = [];
        $currentParentId = $this->parent_id;

        while ($currentParentId !== null && $tasks->has($currentParentId)) {
            $ancestors[] = $currentParentId;
            $currentParentId = $tasks[$currentParentId]->parent_id;
        }

        return $ancestors;
    }

    public function syncCompletionFromProgress(): void
    {
        $this->progress = max(0, min(100, $this->progress));
        $this->completed = $this->progress === 100;
    }

    public function markComplete(): void
    {
        $this->forceFill([
            'progress' => 100,
            'completed' => true,
        ]);
    }

    protected static function booted(): void
    {
        static::saving(function (Task $task): void {
            $task->normalizeKind();
            $task->syncCompletionFromProgress();
            $task->validateKindInvariants();

            if (($task->start_date instanceof CarbonInterface) && ($task->end_date instanceof CarbonInterface) && $task->end_date->lt($task->start_date)) {
                $task->end_date = $task->start_date->copy();
            }
        });
    }

    protected function normalizeKind(): void
    {
        if ($this->kind === null || $this->kind === '') {
            $this->kind = self::KIND_TASK;

            return;
        }

        if (! in_array($this->kind, [self::KIND_TASK, self::KIND_GROUP], true)) {
            throw ValidationException::withMessages([
                'kind' => 'Invalid task kind.',
            ]);
        }
    }

    public function validateKindInvariants(): void
    {
        if (! $this->isGroup()) {
            return;
        }

        $errors = [];

        if ($this->parent_id !== null) {
            $errors['parent_id'] = 'Groups must be root-level tasks.';
        }

        if ($this->dependency_id !== null) {
            $errors['dependency_id'] = 'Groups cannot have dependencies.';
        }

        if ($this->assignee_user_id !== null) {
            $errors['assignee_user_id'] = 'Groups cannot be assigned.';
        }

        if ($this->start_date !== null) {
            $errors['start_date'] = 'Groups cannot have start dates.';
        }

        if ($this->end_date !== null) {
            $errors['end_date'] = 'Groups cannot have end dates.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
