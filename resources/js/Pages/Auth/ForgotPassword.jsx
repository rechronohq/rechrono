import { useForm, usePage } from '@inertiajs/react';

import AuthLayout from '@/Layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPassword() {
    const { flash } = usePage().props;
    const form = useForm({ email: '' });

    return (
        <AuthLayout title="Reset password" subtitle="We’ll send a secure reset link to the email on your account.">
            {flash.status ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {flash.status}
                </div>
            ) : null}

            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/forgot-password');
                }}
            >
                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Email</label>
                    <Input value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} type="email" autoComplete="username" />
                    {form.errors.email ? <p className="text-sm text-rose-600">{form.errors.email}</p> : null}
                </div>

                <Button type="submit" className="w-full" disabled={form.processing}>
                    Email reset link
                </Button>
            </form>
        </AuthLayout>
    );
}
