<?php

use App\Http\Controllers\ApiTokenController;
use App\Http\Controllers\HiveImportController;
use App\Http\Controllers\ImportsPageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectCreatePageController;
use App\Http\Controllers\ProjectDetailsPageController;
use App\Http\Controllers\ProjectEditPageController;
use App\Http\Controllers\ProjectsPageController;
use App\Http\Controllers\ProjectTaskController;
use App\Http\Controllers\TeamInviteController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\TeamSettingsController;
use App\Http\Controllers\TimeEntryController;
use App\Http\Controllers\TimelineDataController;
use App\Http\Controllers\TimelinePageController;
use App\Http\Controllers\TimelineViewController;
use App\Http\Controllers\TimesheetPageController;
use App\Http\Controllers\TimeTimerController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Request $request) {
    return $request->user()?->team
        ? redirect()->route('planner', $request->user()->team)
        : redirect()->route('login');
});

Route::middleware('auth')->group(function () {
    Route::get('/planner', fn (Request $request) => redirect()->route('planner', $request->user()->team));
    Route::get('/tasks', fn (Request $request) => redirect()->route('tasks', $request->user()->team));
    Route::get('/projects', fn (Request $request) => redirect()->route('projects.index', [
        'team' => $request->user()->team,
        ...$request->query(),
    ]));
    Route::get('/imports', fn (Request $request) => redirect()->route('imports.index', $request->user()->team));
    Route::get('/timesheet', fn (Request $request) => redirect()->route('timesheet.index', $request->user()->team));
    Route::get('/projects/new', fn (Request $request) => redirect()->route('projects.create', $request->user()->team));
    Route::get('/projects/{project}', function (Request $request, string $project) {
        $teamProject = $request->user()->team?->projects()->findOrFail($project);

        return redirect()->route('projects.show', [$request->user()->team, $teamProject]);
    });
    Route::get('/projects/{project}/edit', function (Request $request, string $project) {
        $teamProject = $request->user()->team?->projects()->findOrFail($project);

        return redirect()->route('projects.edit', [$request->user()->team, $teamProject]);
    });
});

Route::prefix('{team:slug}')
    ->middleware(['auth', 'team.member'])
    ->scopeBindings()
    ->group(function () {
        Route::get('/planner', TimelinePageController::class)->name('planner');
        Route::get('/tasks', TimelinePageController::class)->name('tasks');
        Route::get('/projects', ProjectsPageController::class)->name('projects.index');
        Route::get('/imports', ImportsPageController::class)->name('imports.index');
        Route::get('/timesheet', TimesheetPageController::class)->name('timesheet.index');
        Route::get('/projects/new', ProjectCreatePageController::class)->name('projects.create');
        Route::get('/projects/{project}', ProjectDetailsPageController::class)->name('projects.show');
        Route::get('/projects/{project}/edit', ProjectEditPageController::class)->name('projects.edit');
        Route::get('/tasks/data', [TimelineDataController::class, 'index'])->name('tasks.data');
        Route::get('/timeline/views/{timelineView}', [TimelineViewController::class, 'show'])->name('timeline-views.show');
        Route::post('/timeline/views', [TimelineViewController::class, 'store'])->name('timeline-views.store');
        Route::patch('/timeline/views/{timelineView}', [TimelineViewController::class, 'update'])->name('timeline-views.update');
        Route::delete('/timeline/views/{timelineView}', [TimelineViewController::class, 'destroy'])->name('timeline-views.destroy');
        Route::get('/projects/{project}/timeline', TimelinePageController::class)->name('projects.timeline');
        Route::post('/imports/hive', [HiveImportController::class, 'store'])->name('imports.hive.store');
        Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
        Route::post('/projects/from-template', [ProjectController::class, 'storeFromTemplate'])->name('projects.from-template');
        Route::patch('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
        Route::post('/projects/bulk-action', [ProjectController::class, 'bulkAction'])->name('projects.bulk-action');
        Route::post('/projects/{project}/duplicate', [ProjectController::class, 'duplicate'])->name('projects.duplicate');
        Route::post('/projects/{project}/template', [ProjectController::class, 'saveAsTemplate'])->name('projects.template');
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
        Route::post('/projects/{project}/tasks', [ProjectTaskController::class, 'store'])->name('projects.tasks.store');
        Route::post('/projects/{project}/tasks/{task}/duplicate', [ProjectTaskController::class, 'duplicate'])->name('projects.tasks.duplicate');
        Route::post('/projects/{project}/tasks/reorder', [ProjectTaskController::class, 'reorder'])->name('projects.tasks.reorder');
        Route::patch('/projects/{project}/tasks/{task}', [ProjectTaskController::class, 'update'])->name('projects.tasks.update');
        Route::delete('/projects/{project}/tasks/{task}', [ProjectTaskController::class, 'destroy'])->name('projects.tasks.destroy');
        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
        Route::get('/settings', [TeamSettingsController::class, 'edit'])->name('team-settings.edit');
        Route::patch('/settings', [TeamSettingsController::class, 'update'])->name('team-settings.update');
        Route::post('/settings/api-tokens', [ApiTokenController::class, 'store'])->name('api-tokens.store');
        Route::delete('/settings/api-tokens/{apiToken}', [ApiTokenController::class, 'destroy'])->name('api-tokens.destroy');
        Route::post('/settings/invites', [TeamInviteController::class, 'store'])->name('team-invites.store');
        Route::delete('/settings/invites/{invitation}', [TeamInviteController::class, 'destroy'])->name('team-invites.destroy');
        Route::delete('/settings/members/{user}', [TeamMemberController::class, 'destroy'])->name('team-members.destroy');
        Route::get('/time/current', [TimeTimerController::class, 'current'])->name('time.current');
        Route::post('/time/tasks/{task}/start', [TimeTimerController::class, 'start'])->withoutScopedBindings()->name('time.timer.start');
        Route::post('/time/timer/stop', [TimeTimerController::class, 'stop'])->name('time.timer.stop');
        Route::post('/time/entries', [TimeEntryController::class, 'store'])->name('time.entries.store');
        Route::patch('/time/entries/{timeEntry}', [TimeEntryController::class, 'update'])->withoutScopedBindings()->name('time.entries.update');
        Route::delete('/time/entries/{timeEntry}', [TimeEntryController::class, 'destroy'])->withoutScopedBindings()->name('time.entries.destroy');
    });

require __DIR__.'/auth.php';
