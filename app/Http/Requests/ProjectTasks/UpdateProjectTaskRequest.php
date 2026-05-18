<?php

namespace App\Http\Requests\ProjectTasks;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectTaskRequest extends FormRequest
{
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
            'project_id' => ['sometimes', 'uuid', 'exists:projects,id'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:tasks,id'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'progress' => ['sometimes', 'integer', 'between:0,100'],
            'completed' => ['sometimes', 'boolean'],
            'interaction' => ['sometimes', 'string', 'in:move,resize_left,resize_right,dependency_set,dependency_clear'],
            'dependency_id' => ['sometimes', 'nullable', 'uuid', 'exists:tasks,id'],
            'assignee_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
