<?php

namespace App\Mcp\Tools\Concerns;

use App\Models\Project;

trait SerializesProjects
{
    /** @return array<string, mixed> */
    protected function projectPayload(Project $project): array
    {
        $project->loadMissing(['client', 'parent.client']);
        $client = $project->effectiveClient();

        return [
            'id' => $project->id,
            'team_id' => $project->team_id,
            'parent_id' => $project->parent_id,
            'client_id' => $client?->id,
            'client' => $client ? ['id' => $client->id, 'name' => $client->name] : null,
            'name' => $project->name,
            'description' => $project->description,
            'is_active' => $project->is_active,
            'is_template' => $project->is_template,
        ];
    }
}
