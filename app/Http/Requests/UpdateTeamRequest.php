<?php

namespace App\Http\Requests;

use App\Models\Team;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        $team = $this->route('team');

        return $team instanceof Team
            && $this->user()?->team_id === $team->id
            && $team->owner_user_id === $this->user()?->id;
    }

    public function rules(): array
    {
        /** @var Team $team */
        $team = $this->route('team');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:80',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::notIn(Team::reservedSlugs()),
                Rule::unique(Team::class, 'slug')->ignore($team),
            ],
            'time_tracking_enabled' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'Use lowercase letters, numbers, and single hyphens only.',
            'slug.not_in' => 'That team URL is reserved.',
            'slug.unique' => 'That team URL is already taken.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'team name',
            'slug' => 'team URL',
        ];
    }
}
