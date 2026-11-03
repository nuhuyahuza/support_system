import { Form, Head, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile() {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-medium">Profile</h2>
                    <p className="text-sm text-[var(--wa-muted)]">Update your name and email address</p>
                </div>

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    className="block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className="block w-full"
                                    defaultValue={auth.user.email ?? ''}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                disabled={processing}
                                className="bg-[var(--wa-accent)] text-white hover:bg-[var(--wa-accent-strong)]"
                                data-test="update-profile-button"
                            >
                                Save
                            </Button>
                        </>
                    )}
                </Form>
            </div>

            <div className="border-t border-[var(--wa-border)] pt-6">
                <DeleteUser />
            </div>
        </>
    );
}
