import { useForm, usePage } from '@inertiajs/react';

import AppShell from '@/Layouts/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProfileEdit({ user }) {
    const { routes } = usePage().props;
    const profileForm = useForm({
        name: user.name,
        email: user.email,
    });
    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const deleteForm = useForm({
        password: '',
    });

    return (
        <AppShell title="Profile">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
                <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-stone-950">Profile</h1>
                        <p className="mt-1 text-sm text-stone-500">Update your identity details for the planner workspace.</p>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            profileForm.patch(routes.profileEdit);
                        }}
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Name</label>
                            <Input value={profileForm.data.name} onChange={(event) => profileForm.setData('name', event.target.value)} />
                            {profileForm.errors.name ? <p className="text-sm text-rose-600">{profileForm.errors.name}</p> : null}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Email</label>
                            <Input type="email" value={profileForm.data.email} onChange={(event) => profileForm.setData('email', event.target.value)} />
                            {profileForm.errors.email ? <p className="text-sm text-rose-600">{profileForm.errors.email}</p> : null}
                        </div>

                        <Button type="submit" disabled={profileForm.processing}>Save profile</Button>
                    </form>
                </section>

                <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Password</h2>
                        <p className="mt-1 text-sm text-stone-500">Change the password used to access your planner account.</p>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            passwordForm.put('/password', {
                                onSuccess: () => passwordForm.reset(),
                                errorBag: 'updatePassword',
                            });
                        }}
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Current password</label>
                            <Input type="password" value={passwordForm.data.current_password} onChange={(event) => passwordForm.setData('current_password', event.target.value)} />
                            {passwordForm.errors.current_password ? <p className="text-sm text-rose-600">{passwordForm.errors.current_password}</p> : null}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">New password</label>
                            <Input type="password" value={passwordForm.data.password} onChange={(event) => passwordForm.setData('password', event.target.value)} />
                            {passwordForm.errors.password ? <p className="text-sm text-rose-600">{passwordForm.errors.password}</p> : null}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Confirm new password</label>
                            <Input type="password" value={passwordForm.data.password_confirmation} onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)} />
                        </div>

                        <Button type="submit" disabled={passwordForm.processing}>Update password</Button>
                    </form>
                </section>

                <section className="rounded-md border border-rose-200 bg-rose-50/40 p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Delete account</h2>
                        <p className="mt-1 text-sm text-stone-500">This permanently removes your user account from the planner.</p>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            deleteForm.delete(routes.profileEdit);
                        }}
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Current password</label>
                            <Input type="password" value={deleteForm.data.password} onChange={(event) => deleteForm.setData('password', event.target.value)} />
                            {deleteForm.errors.password ? <p className="text-sm text-rose-600">{deleteForm.errors.password}</p> : null}
                        </div>

                        <Button type="submit" variant="outline" disabled={deleteForm.processing}>Delete account</Button>
                    </form>
                </section>
            </div>
        </AppShell>
    );
}
