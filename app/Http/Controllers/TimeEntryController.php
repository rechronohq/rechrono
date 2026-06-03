<?php

namespace App\Http\Controllers;

use App\Http\Requests\TimeEntries\UpsertTimeEntryRequest;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Services\TimeTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TimeEntryController extends Controller
{
    public function __construct(
        protected TimeTrackingService $timeTrackingService,
    ) {}

    public function store(UpsertTimeEntryRequest $request, Team $team): JsonResponse
    {
        $entry = $this->timeTrackingService->createManualEntry($team, $request->user(), $request->validated());

        return response()->json([
            'entry' => $entry->toPayload(),
        ], 201);
    }

    public function update(UpsertTimeEntryRequest $request, Team $team, TimeEntry $timeEntry): JsonResponse
    {
        $entry = $this->timeTrackingService->updateManualEntry($team, $request->user(), $timeEntry, $request->validated());

        return response()->json([
            'entry' => $entry->toPayload(),
        ]);
    }

    public function destroy(Request $request, Team $team, TimeEntry $timeEntry): JsonResponse
    {
        $this->timeTrackingService->deleteManualEntry($team, $request->user(), $timeEntry);

        return response()->json(['ok' => true]);
    }

}
