<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Support\TimesheetPayloadBuilder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TimesheetPageController extends Controller
{
    public function __invoke(Request $request, Team $team): Response
    {
        abort_unless($team->time_tracking_enabled, 404);

        return Inertia::render('Timesheet/Index', [
            'timesheet' => app(TimesheetPayloadBuilder::class)->build($request, $team, $request->user()),
        ]);
    }
}
