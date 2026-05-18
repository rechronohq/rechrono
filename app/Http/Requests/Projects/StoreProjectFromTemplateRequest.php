<?php

namespace App\Http\Requests\Projects;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectFromTemplateRequest extends FormRequest
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
            'template_project_id' => ['required', 'uuid', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'selected_project_ids' => ['nullable', 'array'],
            'selected_project_ids.*' => ['uuid', 'exists:projects,id'],
            'selected_assignee_filters' => ['nullable', 'array'],
            'selected_assignee_filters.*' => ['string'],
            'show_weekends' => ['sometimes', 'boolean'],
            'collapsed_project_ids' => ['nullable', 'array'],
            'collapsed_project_ids.*' => ['string'],
        ];
    }
}
