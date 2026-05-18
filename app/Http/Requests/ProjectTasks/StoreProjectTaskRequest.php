<?php

namespace App\Http\Requests\ProjectTasks;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectTaskRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'kind' => ['nullable', 'string', 'in:task,group'],
            'parent_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'dependency_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'assignee_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
