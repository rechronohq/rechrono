<?php

namespace App\Mcp\Tools;

use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Mark a task complete and set progress to 100.')]
class CompleteTask extends Tool
{
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'task_id' => ['required', 'uuid', 'exists:tasks,id'],
        ]);

        $task = Task::findOrFail($validated['task_id']);
        $task->markComplete();
        $task->save();

        return Response::json([
            'task' => [
                'id' => $task->id,
                'name' => $task->name,
                'assignee_user_id' => $task->assignee_user_id,
                'assignee_name' => $task->assigneeLabel(),
                'progress' => $task->progress,
                'completed' => $task->completed,
            ],
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'task_id' => $schema->string()->format('uuid')->required(),
        ];
    }
}
