<?php

use App\Http\Controllers\HiveImportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectCreatePageController;
use App\Http\Controllers\ProjectDetailsPageController;
use App\Http\Controllers\ProjectEditPageController;
use App\Http\Controllers\ProjectsPageController;
use App\Http\Controllers\ProjectTaskController;
use App\Http\Controllers\TimelineDataController;
use App\Http\Controllers\TimelinePageController;
use App\Http\Controllers\TimelineViewController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('planner');
});

Route::middleware('auth')->group(function () {
    Route::get('/planner', TimelinePageController::class)->name('planner');
    Route::get('/tasks', TimelinePageController::class)->name('tasks');
    Route::get('/projects', ProjectsPageController::class)->name('projects.index');
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
});

require __DIR__.'/auth.php';
