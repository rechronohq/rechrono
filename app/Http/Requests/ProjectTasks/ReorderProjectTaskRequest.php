<?php

namespace App\Http\Requests\ProjectTasks;

use App\Http\Requests\Concerns\ValidatesPlannerScope;
use Illuminate\Foundation\Http\FormRequest;

class ReorderProjectTaskRequest extends FormRequest
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
            'task_id' => ['required', 'uuid', $this->projectTaskRule()],
            'target_task_id' => ['required', 'uuid', $this->projectTaskRule()],
            'position' => ['required', 'string', 'in:before,after,into'],
        ];
    }
}
