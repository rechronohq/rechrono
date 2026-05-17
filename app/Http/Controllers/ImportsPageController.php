<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ImportsPageController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('Imports/Index', [
            'importRoutes' => [
                'hive_store' => route('imports.hive.store', $this->currentTeam($request)),
            ],
        ]);
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
