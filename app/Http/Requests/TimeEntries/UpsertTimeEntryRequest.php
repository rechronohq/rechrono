<?php

namespace App\Http\Requests\TimeEntries;

use App\Http\Requests\Concerns\ValidatesPlannerScope;
use Illuminate\Foundation\Http\FormRequest;

class UpsertTimeEntryRequest extends FormRequest
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
            'task_id' => ['required', 'uuid', $this->teamTaskRule()],
            'date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ];
    }
}
