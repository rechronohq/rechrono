import { Link, useForm } from '@inertiajs/react';

import AuthLayout from '@/Layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function slugFor(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

export default function Register() {
    const form = useForm({
        name: '',
        email: '',
        team_name: '',
        team_slug: '',
        password: '',
        password_confirmation: '',
    });

    function updateTeamName(value) {
        const previousGeneratedSlug = slugFor(form.data.team_name);

        form.setData((data) => ({
            ...data,
            team_name: value,
            team_slug: data.team_slug === '' || data.team_slug === previousGeneratedSlug ? slugFor(value) : data.team_slug,
        }));
    }

    return (
        <AuthLayout title="Create your account" subtitle="Choose your team URL and start a private Rechrono workspace.">
            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/register');
                }}
            >
                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Your name</label>
                    <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} autoComplete="name" />
                    {form.errors.name ? <p className="text-sm text-rose-600">{form.errors.name}</p> : null}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Email</label>
                    <Input value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} type="email" autoComplete="username" />
                    {form.errors.email ? <p className="text-sm text-rose-600">{form.errors.email}</p> : null}
                </div>

                <div className="grid gap-5 sm:grid-cols-[1fr_0.8fr]">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-700">Team name</label>
                        <Input value={form.data.team_name} onChange={(event) => updateTeamName(event.target.value)} autoComplete="organization" />
                        {form.errors.team_name ? <p className="text-sm text-rose-600">{form.errors.team_name}</p> : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-700">Team URL</label>
                        <Input value={form.data.team_slug} onChange={(event) => form.setData('team_slug', slugFor(event.target.value))} autoComplete="off" />
                        {form.errors.team_slug ? <p className="text-sm text-rose-600">{form.errors.team_slug}</p> : null}
                    </div>
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
                    Create account
                </Button>

                <div className="text-center text-sm text-stone-500">
                    <Link href="/login" className="transition hover:text-stone-900">Already have an account?</Link>
                </div>
            </form>
        </AuthLayout>
    );
}
