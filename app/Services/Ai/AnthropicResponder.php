<?php

namespace App\Services\Ai;

use App\Contracts\AiResponder;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AnthropicResponder implements AiResponder
{
    public function reply(string $systemPrompt, array $messages): string
    {
        $apiKey = config('support.ai.anthropic.api_key');
        $model = config('support.ai.anthropic.model');

        if (! $apiKey) {
            throw new RuntimeException('Anthropic API key is not configured.');
        }

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
        ])
            ->timeout(45)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => 512,
                'system' => $systemPrompt,
                'messages' => array_map(fn (array $m) => [
                    'role' => $m['role'] === 'assistant' ? 'assistant' : 'user',
                    'content' => $m['content'],
                ], $messages),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Anthropic request failed: '.$response->body());
        }

        return trim((string) data_get($response->json(), 'content.0.text', ''));
    }
}
