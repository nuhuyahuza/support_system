import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            {status && (
                <div className="text-center text-sm font-medium text-[var(--wa-accent)]">
                    {status}
                </div>
            )}

            <Form {...email.form()} className="space-y-4">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="off"
                                autoFocus
                                placeholder="email@example.com"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            className="w-full bg-[var(--wa-accent)] text-white hover:bg-[var(--wa-accent-strong)]"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Email password reset link
                        </Button>
                    </>
                )}
            </Form>

            <p className="text-center text-sm text-[var(--wa-muted)]">
                Or return to{' '}
                <TextLink href={login()} className="text-[var(--wa-accent)]">
                    log in
                </TextLink>
            </p>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link',
};
