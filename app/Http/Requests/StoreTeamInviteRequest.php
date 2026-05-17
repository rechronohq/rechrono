<?php

namespace App\Http\Requests;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreTeamInviteRequest extends FormRequest
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
        return [
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Team $team */
            $team = $this->route('team');
            $email = strtolower((string) $this->input('email'));

            if (User::query()->where('email', $email)->exists()) {
                $validator->errors()->add('email', 'That email already belongs to an account.');

                return;
            }

            if ($team->pendingInvitations()->where('email', $email)->exists()) {
                $validator->errors()->add('email', 'An invitation has already been sent to that email.');
            }
        });
    }
}
