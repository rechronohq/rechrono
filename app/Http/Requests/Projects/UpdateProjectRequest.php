<?php

namespace App\Http\Requests\Projects;

use App\Http\Requests\Concerns\ValidatesPlannerScope;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'budget_hours' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.99'],
            'parent_id' => ['nullable', 'uuid', $this->teamProjectRule()],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', $this->teamProjectRule()],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
        ];
    }
}
