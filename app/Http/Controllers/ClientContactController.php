<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientContact;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientContactController extends Controller
{
    public function store(Request $request, Team $team, Client $client): JsonResponse
    {
        $contact = $client->contacts()->create($this->validated($request));

        return response()->json(['contact' => ['id' => $contact->id]], 201);
    }

    public function update(Request $request, Team $team, Client $client, ClientContact $contact): JsonResponse
    {
        $contact->update($this->validated($request));

        return response()->json(['ok' => true]);
    }

    public function destroy(Team $team, Client $client, ClientContact $contact): JsonResponse
    {
        $contact->delete();

        return response()->json(null, 204);
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
