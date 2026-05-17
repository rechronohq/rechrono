import { Link, useForm } from '@inertiajs/react';

import AuthLayout from '@/Layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AcceptInvite({ invitation, routes }) {
    const form = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    return (
        <AuthLayout
            title="Join your team"
            subtitle={`Create your account to join ${invitation.team_name} on Rechrono.`}
        >
            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(routes.accept);
                }}
            >
                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Email</label>
                    <Input value={invitation.email} disabled className="bg-stone-50" />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Your name</label>
                    <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} autoComplete="name" />
                    {form.errors.name ? <p className="text-sm text-rose-600">{form.errors.name}</p> : null}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Password</label>
                    <Input value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} type="password" autoComplete="new-password" />
                    {form.errors.password ? <p className="text-sm text-rose-600">{form.errors.password}</p> : null}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Confirm password</label>
                    <Input
                        value={form.data.password_confirmation}
                        onChange={(event) => form.setData('password_confirmation', event.target.value)}
                        type="password"
                        autoComplete="new-password"
                    />
                </div>

                <Button type="submit" className="w-full" disabled={form.processing}>
                    Create account
                </Button>

                <div className="text-center text-sm text-stone-500">
                    <Link href="/login" className="transition hover:text-stone-900">Back to sign in</Link>
                </div>
            </form>
        </AuthLayout>
    );
}
