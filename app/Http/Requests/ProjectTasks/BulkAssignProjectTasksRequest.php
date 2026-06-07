<?php

namespace App\Http\Requests\ProjectTasks;

use App\Http\Requests\Concerns\ValidatesPlannerScope;
use Illuminate\Foundation\Http\FormRequest;

class BulkAssignProjectTasksRequest extends FormRequest
{
    use ValidatesPlannerScope;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'task_ids' => ['required', 'array', 'min:1'],
            'task_ids.*' => ['required', 'uuid', 'distinct', $this->projectTaskRule()],
            'assignee_user_id' => ['present', 'nullable', 'integer', $this->teamUserRule()],
        ];
    }
}
