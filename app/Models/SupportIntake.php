<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property string $phone
 * @property int $data_size
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class SupportIntake extends Model
{
    protected $fillable = [
        'conversation_id',
        'phone',
        'data_size',
    ];

    protected function casts(): array
    {
        return [
            'data_size' => 'integer',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
