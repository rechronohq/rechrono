import { Link, useForm } from '@inertiajs/react';

import AuthLayout from '@/Layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPassword({ token, email }) {
    const form = useForm({
        token,
        email: email ?? '',
        password: '',
        password_confirmation: '',
    });

    return (
        <AuthLayout title="Choose a new password" subtitle="Set a new password for your planner account and sign back in.">
            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/reset-password');
                }}
            >
                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Email</label>
                    <Input value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} type="email" autoComplete="username" />
                    {form.errors.email ? <p className="text-sm text-rose-600">{form.errors.email}</p> : null}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Password</label>
                    <Input value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} type="password" autoComplete="new-password" />
                    {form.errors.password ? <p className="text-sm text-rose-600">{form.errors.password}</p> : null}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Confirm password</label>
                    <Input value={form.data.password_confirmation} onChange={(event) => form.setData('password_confirmation', event.target.value)} type="password" autoComplete="new-password" />
                </div>

                <Button type="submit" className="w-full" disabled={form.processing}>
                    Reset password
                </Button>

                <div className="text-center text-sm text-stone-500">
                    <Link href="/login" className="transition hover:text-stone-900">Back to sign in</Link>
                </div>
            </form>
        </AuthLayout>
    );
}
