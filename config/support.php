<?php

return [

    'brand_name' => env('SUPPORT_BRAND_NAME', 'Support'),

    'otp' => [
        'enabled' => env('SUPPORT_OTP_ENABLED', true),
        'driver' => env('SUPPORT_OTP_DRIVER', 'log'),
        'expires_minutes' => (int) env('SUPPORT_OTP_EXPIRES_MINUTES', 10),
        'length' => (int) env('SUPPORT_OTP_LENGTH', 6),
    ],

    'twilio' => [
        'sid' => env('TWILIO_SID'),
        'token' => env('TWILIO_AUTH_TOKEN'),
        'from' => env('TWILIO_FROM'),
    ],

    'ai' => [
        'enabled' => env('SUPPORT_AI_ENABLED', false),
        'provider' => env('SUPPORT_AI_PROVIDER', 'openai'),
        'trigger_mode' => env('SUPPORT_AI_TRIGGER_MODE', 'both'),
        'reply_timeout_seconds' => (int) env('SUPPORT_AI_REPLY_TIMEOUT', 90),
        'system_prompt' => env('SUPPORT_AI_SYSTEM_PROMPT', 'You are a helpful customer support assistant. Be concise, friendly, and professional.'),
        'openai' => [
            'api_key' => env('OPENAI_API_KEY'),
            'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        ],
        'anthropic' => [
            'api_key' => env('ANTHROPIC_API_KEY'),
            'model' => env('ANTHROPIC_MODEL', 'claude-3-5-haiku-latest'),
        ],
    ],

];
