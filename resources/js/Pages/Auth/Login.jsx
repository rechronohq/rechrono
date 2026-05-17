import { Link, useForm, usePage } from '@inertiajs/react';

import AuthLayout from '@/Layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
    const { flash } = usePage().props;
    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    return (
        <AuthLayout title="Sign in" subtitle="Use your Rechrono account to open your team workspace.">
            {flash.status ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {flash.status}
                </div>
            ) : null}

            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/login');
                }}
            >
                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Email</label>
                    <Input value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} type="email" autoComplete="username" />
                    {form.errors.email ? <p className="text-sm text-rose-600">{form.errors.email}</p> : null}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-stone-700">Password</label>
                        <Link href="/forgot-password" className="text-sm text-stone-500 transition hover:text-stone-900">
                            Forgot password
                        </Link>
                    </div>
                    <Input value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} type="password" autoComplete="current-password" />
                    {form.errors.password ? <p className="text-sm text-rose-600">{form.errors.password}</p> : null}
                </div>

                <label className="flex items-center gap-3 text-sm text-stone-600">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                        checked={form.data.remember}
                        onChange={(event) => form.setData('remember', event.target.checked)}
                    />
                    Keep me signed in
                </label>

                <Button type="submit" className="w-full" disabled={form.processing}>
                    Sign in
                </Button>

                <div className="text-center text-sm text-stone-500">
                    <Link href="/register" className="transition hover:text-stone-900">Create an account</Link>
                </div>
            </form>
        </AuthLayout>
    );
}
