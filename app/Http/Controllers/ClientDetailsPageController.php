<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientContact;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientDetailsPageController extends Controller
{
    public function __invoke(Request $request, Team $team, Client $client): Response
    {
        $client->load(['contacts', 'projects']);

        return Inertia::render('Clients/Show', [
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'address' => $client->address,
                'is_active' => $client->is_active,
                'update_url' => route('clients.update', [$team, $client]),
                'destroy_url' => route('clients.destroy', [$team, $client]),
                'contacts_store_url' => route('client-contacts.store', [$team, $client]),
                'contacts' => $client->contacts->map(fn (ClientContact $contact): array => [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'email' => $contact->email,
                    'job_title' => $contact->job_title,
                    'update_url' => route('client-contacts.update', [$team, $client, $contact]),
                    'destroy_url' => route('client-contacts.destroy', [$team, $client, $contact]),
                ])->all(),
                'projects' => $client->projects->map(fn (Project $project): array => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'is_active' => $project->is_active,
                    'show_url' => route('projects.show', [$team, $project]),
                ])->all(),
            ],
        ]);
    }
}
