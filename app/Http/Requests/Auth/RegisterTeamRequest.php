<?php

namespace App\Http\Requests\Auth;

use App\Models\Team;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterTeamRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'team_name' => ['required', 'string', 'max:255'],
            'team_slug' => [
                'required',
                'string',
                'max:80',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::notIn(Team::reservedSlugs()),
                Rule::unique(Team::class, 'slug'),
            ],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    public function messages(): array
    {
        return [
            'team_slug.regex' => 'Use lowercase letters, numbers, and single hyphens only.',
            'team_slug.not_in' => 'That team URL is reserved.',
            'team_slug.unique' => 'That team URL is already taken.',
        ];
    }

    public function attributes(): array
    {
        return [
            'team_name' => 'team name',
            'team_slug' => 'team URL',
        ];
    }
}
