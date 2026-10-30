<?php

namespace App\Services\Auth;

use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\User;
use App\Services\Otp\OtpService;
use App\Services\Settings\SupportSettings;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class CustomerAuthService
{
    public function __construct(
        protected OtpService $otp,
        protected SupportSettings $settings,
    ) {}

    /**
     * @return array{phone: string, name: string|null, exists: bool}
     */
    public function lookupPhone(string $phone): array
    {
        $phone = $this->otp->normalizePhone($phone);
        $user = User::query()->where('phone', $phone)->first();

        if ($user && ! $user->isCustomer()) {
            throw new InvalidArgumentException('This phone number belongs to a staff account.');
        }

        return [
            'phone' => $phone,
            'name' => $user?->name,
            'exists' => $user !== null,
        ];
    }

    /**
     * @return array{requires_otp: bool, phone: string, message: string}
     */
    public function begin(string $phone, string $name): array
    {
        $phone = $this->otp->normalizePhone($phone);
        $name = trim($name);

        if ($name === '') {
            throw new InvalidArgumentException('Name is required.');
        }

        if ($this->settings->otpEnabled()) {
            $this->otp->send($phone, $name);

            return [
                'requires_otp' => true,
                'phone' => $phone,
                'message' => 'Verification code sent.',
            ];
        }

        $user = $this->findOrCreateCustomer($phone, $name);
        $this->login($user);

        return [
            'requires_otp' => false,
            'phone' => $phone,
            'message' => 'Signed in successfully.',
        ];
    }

    public function verify(string $phone, string $code): User
    {
        $otp = $this->otp->verify($phone, $code);
        $user = $this->findOrCreateCustomer($otp->phone, $otp->name ?: 'Customer');
        $this->login($user);

        return $user;
    }

    public function findOrCreateCustomer(string $phone, string $name): User
    {
        $phone = $this->otp->normalizePhone($phone);

        $user = User::query()->where('phone', $phone)->first();

        if ($user) {
            if (! $user->isCustomer()) {
                throw new InvalidArgumentException('This phone number belongs to a staff account.');
            }

            $user->update(['name' => $name]);

            return $user->fresh();
        }

        $user = User::query()->create([
            'name' => $name,
            'phone' => $phone,
            'role' => UserRole::Customer,
            'email' => null,
            'password' => null,
        ]);

        Conversation::query()->create([
            'customer_id' => $user->id,
            'status' => 'open',
            'last_message_at' => now(),
        ]);

        return $user;
    }

    public function login(User $user): void
    {
        Auth::login($user, true);
        $user->update([
            'is_online' => true,
            'last_seen_at' => now(),
        ]);
    }

    public function logout(User $user): void
    {
        $user->update([
            'is_online' => false,
            'last_seen_at' => now(),
        ]);

        Auth::logout();
    }
}
