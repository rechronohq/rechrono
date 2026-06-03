<?php

namespace App\Http\Middleware;

use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $team = $request->route('team') instanceof Team
            ? $request->route('team')
            : $request->user()?->team;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()?->only('id', 'name', 'email', 'is_admin'),
                'team' => $team ? [
                    'id' => $team->id,
                    'name' => $team->name,
                    'slug' => $team->slug,
                    'is_owner' => $team->owner_user_id === $request->user()?->id,
                    'time_tracking_enabled' => $team->time_tracking_enabled,
                ] : null,
            ],
            'flash' => [
                'status' => fn (): ?string => $request->session()->get('status'),
            ],
            'routes' => [
                'apps' => [
                    'planner' => $team ? route('planner', $team) : route('login'),
                    'tasks' => $team ? route('planner', $team) : route('login'),
                    'projects' => $team ? route('projects.index', $team) : route('login'),
                    'imports' => $team ? route('imports.index', $team) : route('login'),
                    ...($team?->time_tracking_enabled ? [
                        'timesheet' => route('timesheet.index', $team),
                    ] : []),
                ],
                ...($team?->time_tracking_enabled ? [
                    'time' => [
                        'current' => route('time.current', $team),
                        'stopTimer' => route('time.timer.stop', $team),
                        'startTimer' => route('time.timer.start', ['team' => $team, 'task' => '__TASK__']),
                        'entriesStore' => route('time.entries.store', $team),
                        'entriesUpdate' => route('time.entries.update', ['team' => $team, 'timeEntry' => '__ENTRY__']),
                        'entriesDestroy' => route('time.entries.destroy', ['team' => $team, 'timeEntry' => '__ENTRY__']),
                    ],
                ] : []),
                'planner' => $team ? route('planner', $team) : route('login'),
                'tasks' => $team ? route('tasks', $team) : route('login'),
                'projects' => [
                    'create' => $team ? route('projects.create', $team) : route('login'),
                    'edit' => $team ? route('projects.edit', ['team' => $team, 'project' => '__PROJECT__']) : route('login'),
                    'index' => $team ? route('projects.index', $team) : route('login'),
                ],
                'imports' => [
                    'index' => $team ? route('imports.index', $team) : route('login'),
                    'hive_store' => $team ? route('imports.hive.store', $team) : route('login'),
                ],
                'projectsApp' => $team ? route('projects.index', $team) : route('login'),
                'tasksData' => $team ? route('tasks.data', $team) : route('login'),
                'timelineViewsStore' => $team ? route('timeline-views.store', $team) : route('login'),
                'importsHiveStore' => $team ? route('imports.hive.store', $team) : route('login'),
                'projectsStore' => $team ? route('projects.store', $team) : route('login'),
                'projectsFromTemplate' => $team ? route('projects.from-template', $team) : route('login'),
                'projectsBulkAction' => $team ? route('projects.bulk-action', $team) : route('login'),
                'projectsTemplate' => $team ? route('projects.template', ['team' => $team, 'project' => '__PROJECT__']) : route('login'),
                'projectsUpdate' => $team ? route('projects.update', ['team' => $team, 'project' => '__PROJECT__']) : route('login'),
                'projectsDuplicate' => $team ? route('projects.duplicate', ['team' => $team, 'project' => '__PROJECT__']) : route('login'),
                'projectsDestroy' => $team ? route('projects.destroy', ['team' => $team, 'project' => '__PROJECT__']) : route('login'),
                'profileEdit' => $team ? route('profile.edit', $team) : route('login'),
                'teamSettingsEdit' => $team ? route('team-settings.edit', $team) : route('login'),
                'logout' => route('logout'),
            ],
            'timelineViews' => fn (): array => $request->user()
                ? $request->user()->timelineViews()->get()->map(fn ($view): array => [
                    'id' => $view->id,
                    'name' => $view->name,
                    'url' => $team ? route('timeline-views.show', [$team, $view]) : route('login'),
                    'update_url' => $team ? route('timeline-views.update', [$team, $view]) : route('login'),
                    'delete_url' => $team ? route('timeline-views.destroy', [$team, $view]) : route('login'),
                ])->all()
                : [],
        ];
    }
}
