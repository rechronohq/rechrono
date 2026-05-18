<?php

use App\Http\Controllers\Api\ProjectApiController;
use App\Http\Controllers\Api\ProjectTaskApiController;
use Illuminate\Support\Facades\Route;

Route::prefix('{team:slug}')
    ->middleware(['auth:sanctum', 'team.member'])
    ->scopeBindings()
    ->group(function () {
        Route::get('/projects', [ProjectApiController::class, 'index'])->name('api.projects.index');
        Route::get('/projects/{project}', [ProjectApiController::class, 'show'])->name('api.projects.show');
        Route::post('/projects/{project}/tasks', [ProjectTaskApiController::class, 'store'])->name('api.projects.tasks.store');
        Route::patch('/projects/{project}/tasks/{task}', [ProjectTaskApiController::class, 'update'])->name('api.projects.tasks.update');
        Route::delete('/projects/{project}/tasks/{task}', [ProjectTaskApiController::class, 'destroy'])->name('api.projects.tasks.destroy');
    });
