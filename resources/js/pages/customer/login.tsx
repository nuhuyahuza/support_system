import { Form, Head, router } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import ChatShell from '@/components/chat/chat-shell';

type Props = {
    otpEnabled: boolean;
    brandName: string;
    step?: 'phone' | 'name';
    phone?: string | null;
    suggestedName?: string | null;
};

export default function CustomerLogin({
    otpEnabled,
    brandName,
    step = 'phone',
    phone = null,
    suggestedName = null,
}: Props) {
    const isNameStep = step === 'name' && Boolean(phone);

    return (
        <ChatShell>
            <Head title="Sign in" />
            <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center px-6">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--wa-accent)] text-2xl font-bold text-white">
                        {brandName.slice(0, 1).toUpperCase()}
                    </div>
                    <h1 className="text-2xl font-semibold">{brandName}</h1>
                    <p className="mt-2 text-sm text-[var(--wa-muted)]">
                        {isNameStep
                            ? 'What should we call you?'
                            : 'Enter your phone number to continue your chat history.'}
                    </p>
                </div>

                <div className="mb-4 flex items-center justify-center gap-2">
                    <StepDot active={!isNameStep} done={isNameStep} label="1" />
                    <div className="h-px w-8 bg-[var(--wa-border)]" />
                    <StepDot active={isNameStep} done={false} label="2" />
                </div>

                {!isNameStep ? (
                    <Form
                        action="/support/login/phone"
                        method="post"
                        className="rounded-2xl bg-[var(--wa-panel)] p-6 shadow-lg"
                    >
                        {({ processing, errors }) => (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone number</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        autoFocus
                                        inputMode="numeric"
                                        autoComplete="tel-national"
                                        pattern="0[0-9]{9}"
                                        maxLength={10}
                                        placeholder="0244123456"
                                        defaultValue={phone ?? ''}
                                        title="Enter a 10-digit Ghana phone number starting with 0"
                                        onInput={(event) => {
                                            const input = event.currentTarget;
                                            input.value = input.value.replace(/\D/g, '').slice(0, 10);
                                        }}
                                    />
                                    <InputError message={errors.phone} />
                                </div>
                                <p className="text-xs text-[var(--wa-muted)]">
                                    Enter a 10-digit Ghana number (e.g. 0244123456). We’ll use it to restore your previous chats.
                                </p>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-[var(--wa-accent)] text-white hover:bg-[var(--wa-accent-strong)]"
                                >
                                    {processing && <Spinner />}
                                    Continue
                                </Button>
                            </div>
                        )}
                    </Form>
                ) : (
                    <Form
                        action="/support/login"
                        method="post"
                        className="rounded-2xl bg-[var(--wa-panel)] p-6 shadow-lg"
                    >
                        {({ processing, errors }) => (
                            <div className="space-y-4">
                                <input type="hidden" name="phone" value={phone ?? ''} />

                                <div className="rounded-lg bg-[var(--wa-input)] px-3 py-2 text-sm">
                                    <div className="text-[11px] uppercase tracking-wide text-[var(--wa-muted)]">
                                        Phone
                                    </div>
                                    <div className="font-medium">{phone}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Your name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        autoFocus
                                        placeholder="Jane Doe"
                                        defaultValue={suggestedName ?? ''}
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <p className="text-xs text-[var(--wa-muted)]">
                                    {otpEnabled
                                        ? 'Next we’ll send a one-time code to verify this number.'
                                        : 'You’ll go straight into your support chat.'}
                                </p>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-[var(--wa-accent)] text-white hover:bg-[var(--wa-accent-strong)]"
                                >
                                    {processing && <Spinner />}
                                    {otpEnabled ? 'Continue' : 'Open chat'}
                                </Button>

                                <button
                                    type="button"
                                    className="w-full text-center text-sm text-[var(--wa-muted)] underline"
                                    onClick={() => router.post('/support/login/back')}
                                >
                                    Use a different number
                                </button>
                            </div>
                        )}
                    </Form>
                )}

                <p className="mt-6 text-center text-xs text-[var(--wa-muted)]">
                    Staff? <a href="/login" className="text-[var(--wa-accent)] underline">Sign in here</a>
                </p>
            </div>
        </ChatShell>
    );
}

function StepDot({
    active,
    done,
    label,
}: {
    active: boolean;
    done: boolean;
    label: string;
}) {
    return (
        <div
            className={[
                'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                active || done
                    ? 'bg-[var(--wa-accent)] text-white'
                    : 'bg-[var(--wa-input)] text-[var(--wa-muted)]',
            ].join(' ')}
        >
            {label}
        </div>
    );
}
