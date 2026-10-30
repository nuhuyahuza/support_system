<?php

namespace App\Services\Ai;

use App\Contracts\AiResponder;

class NullAiResponder implements AiResponder
{
    public function reply(string $systemPrompt, array $messages): string
    {
        return 'Thanks for your message. Our support team will get back to you shortly.';
    }
}
