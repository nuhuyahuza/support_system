<?php

namespace App\Services\Otp;

use App\Contracts\OtpDriver;
use Illuminate\Support\Facades\Log;

class LogOtpDriver implements OtpDriver
{
    public function send(string $phone, string $code): void
    {
        Log::info('Support OTP code generated', [
            'phone' => $phone,
            'code' => $code,
        ]);
    }
}
