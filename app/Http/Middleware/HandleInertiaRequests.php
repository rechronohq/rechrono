<?php

namespace App\Http\Middleware;

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
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()?->only('id', 'name', 'email', 'is_admin'),
            ],
            'flash' => [
                'status' => fn (): ?string => $request->session()->get('status'),
            ],
            'routes' => [
                'apps' => [
                    'planner' => route('planner'),
                    'tasks' => route('planner'),
                    'projects' => route('projects.index'),
                ],
                'planner' => route('planner'),
                'tasks' => route('tasks'),
                'projects' => [
                    'create' => route('projects.create'),
                    'edit' => route('projects.edit', ['project' => '__PROJECT__']),
                    'index' => route('projects.index'),
                ],
                'projectsApp' => route('projects.index'),
                'tasksData' => route('tasks.data'),
                'timelineViewsStore' => route('timeline-views.store'),
                'importsHiveStore' => route('imports.hive.store'),
                'projectsStore' => route('projects.store'),
                'projectsFromTemplate' => route('projects.from-template'),
                'projectsBulkAction' => route('projects.bulk-action'),
                'projectsTemplate' => route('projects.template', ['project' => '__PROJECT__']),
                'projectsUpdate' => route('projects.update', ['project' => '__PROJECT__']),
                'projectsDuplicate' => route('projects.duplicate', ['project' => '__PROJECT__']),
                'projectsDestroy' => route('projects.destroy', ['project' => '__PROJECT__']),
                'profileEdit' => route('profile.edit'),
                'logout' => route('logout'),
            ],
            'timelineViews' => fn (): array => $request->user()
                ? $request->user()->timelineViews()->get()->map(fn ($view): array => [
                    'id' => $view->id,
                    'name' => $view->name,
                    'url' => route('timeline-views.show', $view),
                    'update_url' => route('timeline-views.update', $view),
                    'delete_url' => route('timeline-views.destroy', $view),
                ])->all()
                : [],
        ];
    }
}
