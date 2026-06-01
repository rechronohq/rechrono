<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Team;
use App\Services\TimeTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TimeTimerController extends Controller
{
    public function __construct(
        protected TimeTrackingService $timeTrackingService,
    ) {}

    public function current(Request $request, Team $team): JsonResponse
    {
        abort_unless($team->time_tracking_enabled, 404);

        $entry = $this->timeTrackingService->currentTimer($team, $request->user());

        return response()->json([
            'entry' => $entry?->toPayload(),
        ]);
    }

    public function start(Request $request, Team $team, Task $task): JsonResponse
    {
        $entry = $this->timeTrackingService->startTimer($team, $request->user(), $task);

        return response()->json([
            'entry' => $entry->toPayload(),
        ]);
    }

    public function stop(Request $request, Team $team): JsonResponse
    {
        $entry = $this->timeTrackingService->stopCurrentTimer($team, $request->user());

        return response()->json([
            'entry' => $entry?->toPayload(),
        ]);
    }
}
