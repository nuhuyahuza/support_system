<?php

namespace App\Models;

use App\Enums\MessageSenderType;
use App\Enums\MessageType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property int|null $sender_id
 * @property MessageSenderType $sender_type
 * @property string|null $body
 * @property MessageType $type
 * @property string|null $attachment_path
 * @property string|null $attachment_name
 * @property Carbon|null $delivered_at
 * @property Carbon|null $read_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Message extends Model
{
    /** @use HasFactory<\Database\Factories\MessageFactory> */
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'sender_type',
        'body',
        'type',
        'attachment_path',
        'attachment_name',
        'delivered_at',
        'read_at',
    ];

    protected $appends = ['attachment_url'];

    protected function casts(): array
    {
        return [
            'sender_type' => MessageSenderType::class,
            'type' => MessageType::class,
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function getAttachmentUrlAttribute(): ?string
    {
        if (! $this->attachment_path) {
            return null;
        }

        // Root-relative so images work even when APP_URL host/scheme is wrong
        // (common on cPanel / Cloudflare HTTPS setups).
        return '/storage/'.ltrim($this->attachment_path, '/');
    }

    public function isImageAttachment(): bool
    {
        if ($this->type === MessageType::Image) {
            return true;
        }

        if (! $this->attachment_name) {
            return false;
        }

        return (bool) preg_match('/\.(jpe?g|png|gif|webp|bmp|heic|heif|svg)$/i', $this->attachment_name);
    }
}
