<?php

use App\Http\Controllers\Api\ProjectApiController;
use App\Http\Controllers\Api\ProjectTaskApiController;
use App\Http\Controllers\Api\TeamMemberApiController;
use Illuminate\Support\Facades\Route;

Route::prefix('{team:slug}')
    ->middleware(['auth:sanctum', 'team.member'])
    ->scopeBindings()
    ->group(function () {
        Route::middleware('abilities:planner:read')->group(function () {
            Route::get('/members', [TeamMemberApiController::class, 'index'])->name('api.members.index');
            Route::get('/projects', [ProjectApiController::class, 'index'])->name('api.projects.index');
            Route::get('/projects/{project}', [ProjectApiController::class, 'show'])->name('api.projects.show');
        });

        Route::middleware('abilities:planner:write')->group(function () {
            Route::post('/projects', [ProjectApiController::class, 'store'])->name('api.projects.store');
            Route::post('/projects/from-template', [ProjectApiController::class, 'storeFromTemplate'])->name('api.projects.from-template');
            Route::post('/projects/bulk-action', [ProjectApiController::class, 'bulkAction'])->name('api.projects.bulk-action');
            Route::post('/projects/{project}/duplicate', [ProjectApiController::class, 'duplicate'])->name('api.projects.duplicate');
            Route::post('/projects/{project}/template', [ProjectApiController::class, 'saveAsTemplate'])->name('api.projects.template');
            Route::patch('/projects/{project}', [ProjectApiController::class, 'update'])->name('api.projects.update');
            Route::delete('/projects/{project}', [ProjectApiController::class, 'destroy'])->name('api.projects.destroy');
            Route::post('/projects/{project}/tasks', [ProjectTaskApiController::class, 'store'])->name('api.projects.tasks.store');
            Route::patch('/projects/{project}/tasks/{task}', [ProjectTaskApiController::class, 'update'])->name('api.projects.tasks.update');
            Route::delete('/projects/{project}/tasks/{task}', [ProjectTaskApiController::class, 'destroy'])->name('api.projects.tasks.destroy');
        });
    });
