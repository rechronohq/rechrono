<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\TimeEntry;
use App\Services\TimeTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TimeEntryController extends Controller
{
    public function __construct(
        protected TimeTrackingService $timeTrackingService,
    ) {}

    public function store(Request $request, Team $team): JsonResponse
    {
        $entry = $this->timeTrackingService->createManualEntry($team, $request->user(), $this->validated($request));

        return response()->json([
            'entry' => $entry->toPayload(),
        ], 201);
    }

    public function update(Request $request, Team $team, TimeEntry $timeEntry): JsonResponse
    {
        $entry = $this->timeTrackingService->updateManualEntry($team, $request->user(), $timeEntry, $this->validated($request));

        return response()->json([
            'entry' => $entry->toPayload(),
        ]);
    }

    public function destroy(Request $request, Team $team, TimeEntry $timeEntry): JsonResponse
    {
        $this->timeTrackingService->deleteManualEntry($team, $request->user(), $timeEntry);

        return response()->json(['ok' => true]);
    }

    protected function validated(Request $request): array
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $request->validate([
            'task_id' => ['required', 'uuid', Rule::exists('tasks', 'id')->where(fn ($query) => $query->whereIn('project_id', function ($subquery) use ($team): void {
                $subquery
                    ->select('id')
                    ->from('projects')
                    ->where('team_id', $team->id);
            }))],
            'date' => ['required', 'date'],
            'hours' => ['required', 'numeric', 'min:0.01', 'max:24'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
