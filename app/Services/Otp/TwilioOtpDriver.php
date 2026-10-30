<?php

namespace App\Services\Otp;

use App\Contracts\OtpDriver;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class TwilioOtpDriver implements OtpDriver
{
    public function send(string $phone, string $code): void
    {
        $sid = config('support.twilio.sid');
        $token = config('support.twilio.token');
        $from = config('support.twilio.from');

        if (! $sid || ! $token || ! $from) {
            throw new RuntimeException('Twilio credentials are not configured.');
        }

        $response = Http::withBasicAuth($sid, $token)
            ->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'From' => $from,
                'To' => $this->formatPhone($phone),
                'Body' => "Your support verification code is {$code}",
            ]);

        if ($response->failed()) {
            Log::error('Twilio OTP send failed', [
                'phone' => $phone,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('Failed to send OTP via Twilio.');
        }
    }

    protected function formatPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? $phone;

        if (str_starts_with($digits, '0')) {
            $digits = '233'.substr($digits, 1);
        }

        return str_starts_with($digits, '+') ? $digits : '+'.$digits;
    }
}
