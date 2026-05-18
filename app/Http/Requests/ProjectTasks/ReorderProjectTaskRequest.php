<?php

namespace App\Http\Requests\ProjectTasks;

use Illuminate\Foundation\Http\FormRequest;

class ReorderProjectTaskRequest extends FormRequest
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
            'task_id' => ['required', 'uuid', 'exists:tasks,id'],
            'target_task_id' => ['required', 'uuid', 'exists:tasks,id'],
            'position' => ['required', 'string', 'in:before,after,into'],
        ];
    }
}
