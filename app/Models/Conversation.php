<?php

namespace App\Models;

use App\Enums\ConversationStatus;
use App\Enums\IntakeStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $customer_id
 * @property int|null $assigned_agent_id
 * @property ConversationStatus $status
 * @property bool $ai_active
 * @property IntakeStatus $intake_status
 * @property string|null $intake_phone
 * @property int|null $intake_data_size
 * @property Carbon|null $last_message_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Conversation extends Model
{
    /** @use HasFactory<\Database\Factories\ConversationFactory> */
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'assigned_agent_id',
        'status',
        'ai_active',
        'intake_status',
        'intake_phone',
        'intake_data_size',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ConversationStatus::class,
            'ai_active' => 'boolean',
            'intake_status' => IntakeStatus::class,
            'intake_data_size' => 'integer',
            'last_message_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_agent_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function intakes(): HasMany
    {
        return $this->hasMany(SupportIntake::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }
}
