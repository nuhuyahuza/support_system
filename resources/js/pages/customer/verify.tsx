import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import ChatShell from '@/components/chat/chat-shell';

type Props = {
    phone: string;
    name?: string;
    status?: string;
    brandName: string;
};

export default function CustomerVerify({ phone, status, brandName }: Props) {
    return (
        <ChatShell>
            <Head title="Verify phone" />
            <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center px-6">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold">{brandName}</h1>
                    <p className="mt-2 text-sm text-[var(--wa-muted)]">
                        Enter the code sent to <span className="font-medium text-[var(--wa-fg)]">{phone}</span>
                    </p>
                    {status && <p className="mt-2 text-sm text-[var(--wa-accent)]">{status}</p>}
                </div>

                <Form
                    action="/support/verify"
                    method="post"
                    className="rounded-2xl bg-[var(--wa-panel)] p-6 shadow-lg"
                >
                    {({ processing, errors }) => (
                        <div className="space-y-4">
                            <input type="hidden" name="phone" value={phone} />
                            <div className="space-y-2">
                                <Label htmlFor="code">Verification code</Label>
                                <Input
                                    id="code"
                                    name="code"
                                    required
                                    autoFocus
                                    inputMode="numeric"
                                    placeholder="123456"
                                    className="tracking-[0.35em]"
                                />
                                <InputError message={errors.code} />
                            </div>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-[var(--wa-accent)] text-white hover:bg-[var(--wa-accent-strong)]"
                            >
                                {processing && <Spinner />}
                                Verify & chat
                            </Button>
                            <a href="/support/login" className="block text-center text-sm text-[var(--wa-muted)] underline">
                                Use a different number
                            </a>
                        </div>
                    )}
                </Form>
            </div>
        </ChatShell>
    );
}

CustomerVerify.layout = null;
