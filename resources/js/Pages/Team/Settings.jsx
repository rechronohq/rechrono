import { router, useForm, usePage } from '@inertiajs/react';

import AppPage from '@/Layouts/AppPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function memberLabel(member) {
    return member.type === 'invitation' ? member.email : member.name;
}

export default function TeamSettings({ team, members, teamSettingsRoutes }) {
    const { auth, flash } = usePage().props;
    const isOwner = auth.team?.is_owner ?? false;
    const teamForm = useForm({
        name: team.name,
        slug: team.slug,
    });

    const inviteForm = useForm({
        email: '',
    });

    const statusMessages = {
        'team-updated': 'Team settings saved.',
        'invite-sent': 'Invitation sent. They can create their account from the email link.',
        'invite-cancelled': 'Invitation cancelled.',
        'member-removed': 'Member removed.',
    };

    return (
        <AppPage title="Team settings" activeApp="settings">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
                {flash?.status && statusMessages[flash.status] ? (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {statusMessages[flash.status]}
                    </p>
                ) : null}

                <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-stone-950">Team settings</h1>
                        <p className="mt-1 text-sm text-stone-500">
                            {isOwner
                                ? 'Manage your team name, URL, and members.'
                                : 'View your team details. Contact the owner to make changes.'}
                        </p>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!isOwner) {
                                return;
                            }

                            teamForm.patch(teamSettingsRoutes.teamSettingsUpdate);
                        }}
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Team name</label>
                            <Input
                                value={teamForm.data.name}
                                onChange={(event) => teamForm.setData('name', event.target.value)}
                                disabled={!isOwner}
                            />
                            {teamForm.errors.name ? <p className="text-sm text-rose-600">{teamForm.errors.name}</p> : null}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Team URL</label>
                            <div className="flex items-center gap-2">
                                <span className="shrink-0 text-sm text-stone-400">/</span>
                                <Input
                                    value={teamForm.data.slug}
                                    onChange={(event) => teamForm.setData('slug', event.target.value)}
                                    disabled={!isOwner}
                                    className="font-mono text-sm"
                                />
                            </div>
                            {teamForm.errors.slug ? <p className="text-sm text-rose-600">{teamForm.errors.slug}</p> : null}
                        </div>

                        {isOwner ? (
                            <Button type="submit" disabled={teamForm.processing}>Save team settings</Button>
                        ) : null}
                    </form>
                </section>

                <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">Members</h2>
                        <p className="mt-1 text-sm text-stone-500">People who can access this team workspace.</p>
                    </div>

                    <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
                        {members.map((member) => (
                            <li key={`${member.type}-${member.id}`} className="flex items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-stone-950">
                                        {member.type === 'invitation' ? member.email : member.name}
                                        {member.is_owner ? (
                                            <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600">
                                                Owner
                                            </span>
                                        ) : null}
                                        {member.type === 'invitation' ? (
                                            <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                                Invited
                                            </span>
                                        ) : null}
                                    </p>
                                    {member.type === 'member' ? (
                                        <p className="truncate text-sm text-stone-500">{member.email}</p>
                                    ) : (
                                        <p className="truncate text-sm text-stone-500">Waiting to accept invitation</p>
                                    )}
                                </div>
                                {isOwner && member.destroy_url ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={inviteForm.processing || teamForm.processing}
                                        onClick={() => {
                                            const action = member.type === 'invitation' ? 'Cancel invitation to' : 'Remove';
                                            if (!window.confirm(`${action} ${memberLabel(member)}?`)) {
                                                return;
                                            }

                                            router.delete(member.destroy_url, {
                                                preserveScroll: true,
                                            });
                                        }}
                                    >
                                        {member.type === 'invitation' ? 'Cancel' : 'Remove'}
                                    </Button>
                                ) : null}
                            </li>
                        ))}
                    </ul>

                    {isOwner ? (
                        <form
                            className="mt-6 space-y-4 border-t border-stone-100 pt-6"
                            onSubmit={(event) => {
                                event.preventDefault();
                                inviteForm.post(teamSettingsRoutes.teamInvitesStore, {
                                    preserveScroll: true,
                                    onSuccess: () => inviteForm.reset(),
                                });
                            }}
                        >
                            <h3 className="text-sm font-medium text-stone-700">Invite member</h3>
                            <p className="text-sm text-stone-500">
                                Send an email invitation. They will choose their own name when creating their account.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <label className="text-sm font-medium text-stone-700">Email</label>
                                    <Input
                                        type="email"
                                        value={inviteForm.data.email}
                                        onChange={(event) => inviteForm.setData('email', event.target.value)}
                                        placeholder="colleague@example.com"
                                    />
                                    {inviteForm.errors.email ? <p className="text-sm text-rose-600">{inviteForm.errors.email}</p> : null}
                                </div>
                                <Button type="submit" disabled={inviteForm.processing} className="sm:mb-0">
                                    Send invitation
                                </Button>
                            </div>
                        </form>
                    ) : null}
                </section>
            </div>
        </AppPage>
    );
}
