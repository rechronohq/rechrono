<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientsPageController extends Controller
{
    public function __invoke(Request $request, Team $team): Response
    {
        $status = $request->validate(['status' => ['nullable', 'in:active,archived,all']])['status'] ?? 'active';

        $clients = $team->clients()
            ->withCount(['contacts', 'projects'])
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'archived', fn ($query) => $query->where('is_active', false))
            ->get()
            ->map(fn (Client $client): array => [
                'id' => $client->id,
                'name' => $client->name,
                'address' => $client->address,
                'is_active' => $client->is_active,
                'contacts_count' => $client->contacts_count,
                'projects_count' => $client->projects_count,
                'show_url' => route('clients.show', [$team, $client]),
                'update_url' => route('clients.update', [$team, $client]),
                'destroy_url' => route('clients.destroy', [$team, $client]),
            ])->all();

        return Inertia::render('Clients/Index', [
            'clients' => [
                'rows' => $clients,
                'status_filter' => $status,
                'store_url' => route('clients.store', $team),
            ],
        ]);
    }
}
