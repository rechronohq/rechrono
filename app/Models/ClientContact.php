<?php

namespace App\Models;

use Database\Factories\ClientContactFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientContact extends Model
{
    /** @use HasFactory<ClientContactFactory> */
    use HasFactory, HasUuids;

    protected $fillable = ['client_id', 'name', 'email', 'job_title'];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
