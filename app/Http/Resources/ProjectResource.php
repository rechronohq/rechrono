<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $client = $this->effectiveClient();

        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'parent_id' => $this->parent_id,
            'client_id' => $client?->id,
            'client' => $client ? ['id' => $client->id, 'name' => $client->name] : null,
            'name' => $this->name,
            'description' => $this->description,
            'is_template' => $this->is_template,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
            'tasks' => TaskResource::collection($this->whenLoaded('tasks')),
        ];
    }
}
