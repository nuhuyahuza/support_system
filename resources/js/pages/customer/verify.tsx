import { Form, Head } from '@inertiajs/react';
import { AuthFormPanel, AuthScreen } from '@/components/chat/auth-panel';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    phone: string;
    name?: string;
    status?: string;
    brandName: string;
};

export default function CustomerVerify({ phone, status, brandName }: Props) {
    return (
        <>
            <Head title="Verify phone" />
            <AuthScreen
                brandName={brandName}
                description={
                    <>
                        Enter the code sent to{' '}
                        <span className="font-medium text-[var(--wa-fg)]">{phone}</span>
                    </>
                }
            >
                {status ? (
                    <p className="-mt-4 mb-4 text-center text-sm text-[var(--wa-accent)]">{status}</p>
                ) : null}
                <Form action="/verify" method="post">
                    {({ processing, errors }) => (
                        <AuthFormPanel className="space-y-4">
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
                            <a
                                href="/login"
                                className="block text-center text-sm text-[var(--wa-muted)] underline"
                            >
                                Use a different number
                            </a>
                        </AuthFormPanel>
                    )}
                </Form>
            </AuthScreen>
        </>
    );
}
