import { useForm } from '@inertiajs/react';

import AuthLayout from '@/Layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ConfirmPassword() {
    const form = useForm({ password: '' });

    return (
        <AuthLayout title="Confirm password" subtitle="This action is protected. Enter your current password to continue.">
            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/confirm-password');
                }}
            >
                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Password</label>
                    <Input value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} type="password" autoComplete="current-password" />
                    {form.errors.password ? <p className="text-sm text-rose-600">{form.errors.password}</p> : null}
                </div>

                <Button type="submit" className="w-full" disabled={form.processing}>
                    Confirm
                </Button>
            </form>
        </AuthLayout>
    );
}
