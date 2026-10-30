<?php

namespace App\Services\Ai;

use App\Contracts\AiResponder;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAiResponder implements AiResponder
{
    public function reply(string $systemPrompt, array $messages): string
    {
        $apiKey = config('support.ai.openai.api_key');
        $model = config('support.ai.openai.model');

        if (! $apiKey) {
            throw new RuntimeException('OpenAI API key is not configured.');
        }

        $payloadMessages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $messages,
        );

        $response = Http::withToken($apiKey)
            ->timeout(45)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'messages' => $payloadMessages,
                'temperature' => 0.4,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('OpenAI request failed: '.$response->body());
        }

        return trim((string) data_get($response->json(), 'choices.0.message.content', ''));
    }
}
