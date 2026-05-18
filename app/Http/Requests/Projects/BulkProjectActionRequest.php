<?php

namespace App\Http\Requests\Projects;

use App\Http\Requests\Concerns\ValidatesPlannerScope;
use Illuminate\Foundation\Http\FormRequest;

class BulkProjectActionRequest extends FormRequest
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
            'action' => ['required', 'in:archive,unarchive,change-parent,delete'],
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['uuid', $this->teamProjectRule()],
            'parent_id' => ['nullable', 'uuid', $this->teamProjectRule()],
        ];
    }
}
