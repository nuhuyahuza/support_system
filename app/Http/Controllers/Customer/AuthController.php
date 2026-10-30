<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Services\Auth\CustomerAuthService;
use App\Services\Settings\SupportSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class AuthController extends Controller
{
    public function create(Request $request, SupportSettings $settings): Response|RedirectResponse
    {
        if (auth()->check() && auth()->user()->isCustomer()) {
            return redirect()->route('support.index');
        }

        return Inertia::render('customer/login', [
            'otpEnabled' => $settings->otpEnabled(),
            'brandName' => $settings->brandName(),
            'step' => $request->session()->get('login_step', 'phone'),
            'phone' => $request->session()->get('login_phone'),
            'suggestedName' => $request->session()->get('login_suggested_name'),
        ]);
    }

    public function storePhone(Request $request, CustomerAuthService $auth): RedirectResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^0\d{9}$/'],
        ], [
            'phone.regex' => 'Enter a valid 10-digit Ghana phone number starting with 0.',
        ]);

        try {
            $lookup = $auth->lookupPhone($data['phone']);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'phone' => $e->getMessage(),
            ]);
        }

        $request->session()->put([
            'login_step' => 'name',
            'login_phone' => $lookup['phone'],
            'login_suggested_name' => $lookup['name'],
        ]);

        return redirect()->route('customer.login');
    }

    public function store(Request $request, CustomerAuthService $auth): RedirectResponse
    {
        $phone = $request->input('phone') ?: $request->session()->get('login_phone');

        $data = $request->validate([
            'phone' => ['nullable', 'string', 'regex:/^0\d{9}$/'],
            'name' => ['required', 'string', 'max:120'],
        ], [
            'phone.regex' => 'Enter a valid 10-digit Ghana phone number starting with 0.',
        ]);

        if (! $phone) {
            throw ValidationException::withMessages([
                'phone' => 'Enter your phone number first.',
            ]);
        }

        try {
            $result = $auth->begin($phone, $data['name']);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'name' => $e->getMessage(),
            ]);
        }

        $request->session()->forget(['login_step', 'login_phone', 'login_suggested_name']);

        if ($result['requires_otp']) {
            return redirect()
                ->route('customer.verify')
                ->with('phone', $result['phone'])
                ->with('name', $data['name'])
                ->with('status', $result['message']);
        }

        return redirect()->route('support.index');
    }

    public function backToPhone(Request $request): RedirectResponse
    {
        $request->session()->forget(['login_step', 'login_phone', 'login_suggested_name']);

        return redirect()->route('customer.login');
    }

    public function showVerify(Request $request, SupportSettings $settings): Response|RedirectResponse
    {
        $phone = $request->session()->get('phone');

        if (! $phone) {
            return redirect()->route('customer.login');
        }

        return Inertia::render('customer/verify', [
            'phone' => $phone,
            'name' => $request->session()->get('name'),
            'status' => $request->session()->get('status'),
            'brandName' => $settings->brandName(),
        ]);
    }

    public function verify(Request $request, CustomerAuthService $auth): RedirectResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'code' => ['required', 'string', 'min:4', 'max:8'],
        ]);

        try {
            $auth->verify($data['phone'], $data['code']);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'code' => $e->getMessage(),
            ]);
        }

        $request->session()->forget(['phone', 'name']);

        return redirect()->route('support.index');
    }

    public function destroy(Request $request, CustomerAuthService $auth): RedirectResponse
    {
        if ($request->user()) {
            $auth->logout($request->user());
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('customer.login');
    }
}
