<?php

namespace App\Http\Requests\ProjectTasks;

use App\Http\Requests\Concerns\ValidatesPlannerScope;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectTaskRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'kind' => ['sometimes', 'string', 'in:task,group'],
            'project_id' => ['sometimes', 'uuid', $this->teamProjectRule()],
            'parent_id' => ['sometimes', 'nullable', 'uuid', $this->teamTaskRule()],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'progress' => ['sometimes', 'integer', 'between:0,100'],
            'completed' => ['sometimes', 'boolean'],
            'interaction' => ['sometimes', 'string', 'in:move,resize_left,resize_right,dependency_set,dependency_clear'],
            'dependency_id' => ['sometimes', 'nullable', 'uuid', $this->teamTaskRule()],
            'assignee_user_id' => ['sometimes', 'nullable', 'integer', $this->teamUserRule()],
        ];
    }
}
