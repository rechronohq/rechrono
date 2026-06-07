<?php

namespace App\Models;

use Database\Factories\TeamFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'slug',
        'owner_user_id',
        'time_tracking_enabled',
    ];

    protected function casts(): array
    {
        return [
            'time_tracking_enabled' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class)->orderBy('name');
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(TeamInvitation::class)->orderBy('email');
    }

    public function pendingInvitations(): HasMany
    {
        return $this->invitations()->whereNull('accepted_at');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class)->orderBy('name');
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class)->orderBy('name');
    }

    public function timelineViews(): HasMany
    {
        return $this->hasMany(TimelineView::class)->orderBy('name');
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public static function reservedSlugs(): array
    {
        return [
            'admin',
            'api',
            'confirm-password',
            'email',
            'filament',
            'forgot-password',
            'imports',
            'livewire-ca35a2c1',
            'login',
            'logout',
            'mcp',
            'password',
            'invite',
            'profile',
            'register',
            'reset-password',
            'settings',
            'storage',
            'up',
            'verify-email',
        ];
    }
}
