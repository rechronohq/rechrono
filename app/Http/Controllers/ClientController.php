<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function store(Request $request, Team $team): JsonResponse
    {
        $validated = $this->validated($request);
        $client = $team->clients()->create($validated);

        return response()->json([
            'client' => ['id' => $client->id, 'show_url' => route('clients.show', [$team, $client])],
        ], 201);
    }

    public function update(Request $request, Team $team, Client $client): JsonResponse
    {
        $client->update($this->validated($request));

        return response()->json(['ok' => true]);
    }

    public function destroy(Team $team, Client $client): JsonResponse
    {
        abort_if($client->projects()->exists(), 422, 'Clients with projects cannot be deleted.');
        $client->delete();

        return response()->json(null, 204);
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
