<?php

namespace App\Contracts;

interface AiResponder
{
    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    public function reply(string $systemPrompt, array $messages): string;
}
