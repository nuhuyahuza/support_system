<?php

namespace App\Services\Otp;

use App\Contracts\OtpDriver;
use App\Models\OtpCode;
use App\Services\Settings\SupportSettings;
use InvalidArgumentException;

class OtpService
{
    public function __construct(protected SupportSettings $settings) {}

    public function driver(): OtpDriver
    {
        return match ($this->settings->otpDriver()) {
            'twilio' => app(TwilioOtpDriver::class),
            default => app(LogOtpDriver::class),
        };
    }

    public function send(string $phone, string $name): OtpCode
    {
        $phone = $this->normalizePhone($phone);
        $length = (int) config('support.otp.length', 6);
        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);

        OtpCode::query()
            ->where('phone', $phone)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $otp = OtpCode::query()->create([
            'phone' => $phone,
            'name' => $name,
            'code' => $code,
            'expires_at' => now()->addMinutes((int) config('support.otp.expires_minutes', 10)),
        ]);

        $this->driver()->send($phone, $code);

        return $otp;
    }

    public function verify(string $phone, string $code): OtpCode
    {
        $phone = $this->normalizePhone($phone);

        $otp = OtpCode::query()
            ->where('phone', $phone)
            ->where('code', $code)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (! $otp || ! $otp->isValid()) {
            throw new InvalidArgumentException('Invalid or expired verification code.');
        }

        $otp->update(['consumed_at' => now()]);

        return $otp;
    }

    public function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            throw new InvalidArgumentException('Phone number is required.');
        }

        // Accept local Ghana numbers (0244123456) or +233 / 233 prefixed forms.
        if (str_starts_with($digits, '233') && strlen($digits) === 12) {
            $digits = '0'.substr($digits, 3);
        }

        if (! preg_match('/^0\d{9}$/', $digits)) {
            throw new InvalidArgumentException('Enter a valid 10-digit Ghana phone number starting with 0.');
        }

        return $digits;
    }
}
