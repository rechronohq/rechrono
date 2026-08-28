<?php

namespace App\Mcp\Tools;

use App\Mcp\PlannerMcpContext;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('List team members that can be assigned to tasks.')]
#[IsReadOnly]
class ListMembers extends Tool
{
    public function __construct(protected PlannerMcpContext $context) {}

    public function handle(Request $request): Response
    {
        $validated = $request->validate(['team_slug' => ['required', 'string']]);
        $team = $this->context->teamForSlug($validated['team_slug'], 'planner:read');

        return Response::json(['members' => $team->users()->get(['id', 'name', 'email'])->map(fn ($user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ])->all()]);
    }

    public function schema(JsonSchema $schema): array
    {
        return ['team_slug' => $schema->string()->required()];
    }

    public function shouldRegister(): bool
    {
        return $this->context->canUse('planner:read');
    }
}
