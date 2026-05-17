<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Team;
use App\Support\ProjectsTablePayloadBuilder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectsPageController extends Controller
{
    public function __construct(
        protected ProjectsTablePayloadBuilder $projectsTablePayloadBuilder,
    ) {}

    public function __invoke(Request $request): Response
    {
        $statusFilter = $request->validate([
            'status' => ['nullable', 'in:active,archived,templates,all'],
        ])['status'] ?? 'active';

        return Inertia::render('Projects/Index', [
            'projects' => $this->projectsPayload($this->currentTeam($request), $statusFilter),
        ]);
    }

    protected function projectsPayload(Team $team, string $statusFilter): array
    {
        $projects = $team->projects()
            ->when($statusFilter !== 'templates' && $statusFilter !== 'all', fn ($query) => $query->plannerVisible())
            ->when($statusFilter === 'templates', fn ($query) => $query->templates())
            ->when($statusFilter === 'active', fn ($query) => $query->active())
            ->when($statusFilter === 'archived', fn ($query) => $query->archived())
            ->get();

        return $this->projectsTablePayloadBuilder->build($projects, $statusFilter, $team);
    }

    protected function currentTeam(Request $request): Team
    {
        /** @var Team $team */
        $team = $request->route('team');

        return $team;
    }
}
