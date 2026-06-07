<?php

namespace App\Http\Requests\Projects;

use App\Http\Requests\Concerns\ValidatesPlannerScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectFromTemplateRequest extends FormRequest
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
            'template_project_id' => ['required', 'uuid', $this->teamTemplateProjectRule()],
            'name' => ['required', 'string', 'max:255'],
            'client_id' => ['nullable', Rule::prohibitedIf($this->filled('parent_id')), 'uuid', $this->activeTeamClientRule()],
            'parent_id' => ['nullable', 'uuid', $this->teamProjectRule()],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', $this->teamProjectRule()],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
            'collapsed_project_ids' => ['nullable', 'array'],
            'collapsed_project_ids.*' => ['string'],
        ];
    }
}
