<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('List clients that can be associated with projects.')]
#[IsReadOnly]
class ListClients extends Tool
{
    public function __construct(protected PlannerMcpContext $context) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'team_slug' => ['required', 'string'],
            'status' => ['nullable', 'string', 'in:active,archived,all'],
        ]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:read');
        $status = $validated['status'] ?? 'active';
        $clients = $team->clients()
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'archived', fn ($query) => $query->where('is_active', false))
            ->get(['id', 'name', 'is_active'])
            ->map(fn ($client) => ['id' => $client->id, 'name' => $client->name, 'is_active' => $client->is_active])
            ->all();

        return Response::json(['clients' => $clients]);
    }

    public function schema(JsonSchema $schema): array
    {
        return ['team_slug' => $schema->string()->required(), 'status' => $schema->string()->nullable()];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:read');
    }
}
