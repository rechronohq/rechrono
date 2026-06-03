import { router, useForm, usePage } from '@inertiajs/react';
import { Clock3, KeyRound, UsersRound } from 'lucide-react';

import AppPage from '@/Layouts/AppPage';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

function memberLabel(member) {
    return member.type === 'invitation' ? member.email : member.name;
}

function formatTokenTimestamp(value) {
    if (!value) {
        return 'Never';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatTokenAccess(abilities) {
    if (abilities?.includes('*') || abilities?.includes('planner:write')) {
        return 'Read and write';
    }

    return 'Read only';
}

export default function TeamSettings({ team, members, apiTokens = [], newApiToken = null, teamSettingsRoutes }) {
    const { auth, flash } = usePage().props;
    const isOwner = auth.team?.is_owner ?? false;
    const teamForm = useForm({
        name: team.name,
        slug: team.slug,
        time_tracking_enabled: Boolean(team.time_tracking_enabled),
    });
    const isTimeTrackingEnabled = Boolean(teamForm.data.time_tracking_enabled);

    const inviteForm = useForm({
        email: '',
    });

    const apiTokenForm = useForm({
        name: '',
        ability: 'planner:read',
    });

    const statusMessages = {
        'team-updated': 'Team settings saved.',
        'invite-sent': 'Invitation sent. They can create their account from the email link.',
        'invite-cancelled': 'Invitation cancelled.',
        'member-removed': 'Member removed.',
        'api-token-created': 'API token created. Store it now; it will not be shown again.',
        'api-token-revoked': 'API token revoked.',
    };

    return (
        <AppPage title="Team settings" activeApp="settings">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
                {flash?.status && statusMessages[flash.status] ? (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {statusMessages[flash.status]}
                    </p>
                ) : null}

                <div>
                    <h1 className="text-2xl font-semibold text-stone-950">Team settings</h1>
                    <p className="mt-1 max-w-2xl text-sm text-stone-500">
                        {isOwner
                            ? 'Manage the workspace profile, members, integrations, and optional team modules.'
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
                    <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-400">Workspace</p>
                            <h2 className="mt-2 text-xl font-semibold text-stone-950">Team profile</h2>
                            <p className="mt-1 text-sm text-stone-500">Core identity and URL settings for this team.</p>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
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
                        </div>
                    </section>

                    <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-400">Configuration</p>
                            <h2 className="mt-2 text-xl font-semibold text-stone-950">Modules</h2>
                            <p className="mt-1 text-sm text-stone-500">Turn optional team apps and workflows on or off.</p>
                        </div>

                        <div className="rounded-md border border-blue-100 bg-blue-50/40 p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-white text-blue-600 shadow-sm">
                                        <Clock3 className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-stone-950">Time tracking</h3>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    isTimeTrackingEnabled
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-stone-100 text-stone-600'
                                                }`}
                                            >
                                                {isTimeTrackingEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
                                            Adds task timers, a Timesheet app, editable weekly entries, and project actuals against budget hours.
                                        </p>
                                    </div>
                                </div>

                                <label className="flex min-w-[180px] items-start gap-3 rounded-[6px] border border-stone-200 bg-white px-3 py-3 text-sm text-stone-700 shadow-sm">
                                    <Checkbox
                                        checked={teamForm.data.time_tracking_enabled}
                                        onCheckedChange={(checked) => teamForm.setData('time_tracking_enabled', Boolean(checked))}
                                        disabled={!isOwner}
                                        aria-label="Enable time tracking"
                                    />
                                    <span>
                                        <span className="block font-medium text-stone-900">
                                            {isTimeTrackingEnabled ? 'Active' : 'Enable module'}
                                        </span>
                                        <span className="mt-0.5 block text-stone-500">
                                            {isOwner ? 'Save to apply' : 'Owner only'}
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {isOwner ? (
                        <div className="flex justify-end">
                            <Button type="submit" disabled={teamForm.processing}>Save team settings</Button>
                        </div>
                    ) : null}
                </form>

                <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-stone-100 text-stone-600">
                            <UsersRound className="h-[18px] w-[18px]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-stone-950">Members</h2>
                            <p className="mt-1 text-sm text-stone-500">People who can access this team workspace.</p>
                        </div>
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

                <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-stone-100 text-stone-600">
                            <KeyRound className="h-[18px] w-[18px]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-stone-950">API tokens</h2>
                            <p className="mt-1 text-sm text-stone-500">
                                Create personal tokens for API clients and integrations.
                            </p>
                        </div>
                    </div>

                    {newApiToken ? (
                        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-900">New API token</p>
                            <p className="mt-1 text-sm text-amber-800">
                                Store this token now. For security, it will only be shown once.
                            </p>
                            <Input
                                readOnly
                                value={newApiToken}
                                className="mt-3 font-mono text-xs"
                                aria-label="New API token"
                            />
                        </div>
                    ) : null}

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            apiTokenForm.post(teamSettingsRoutes.apiTokensStore, {
                                preserveScroll: true,
                                onSuccess: () => apiTokenForm.reset(),
                            });
                        }}
                    >
                        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                            <div className="min-w-0 flex-1 space-y-2">
                                <label className="text-sm font-medium text-stone-700">Token name</label>
                                <Input
                                    value={apiTokenForm.data.name}
                                    onChange={(event) => apiTokenForm.setData('name', event.target.value)}
                                    placeholder="Zapier, local script, reporting client"
                                />
                                {apiTokenForm.errors.name ? <p className="text-sm text-rose-600">{apiTokenForm.errors.name}</p> : null}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Access</label>
                                <Select
                                    value={apiTokenForm.data.ability}
                                    onChange={(event) => apiTokenForm.setData('ability', event.target.value)}
                                >
                                    <option value="planner:read">Read only</option>
                                    <option value="planner:write">Read and write</option>
                                </Select>
                                {apiTokenForm.errors.ability ? <p className="text-sm text-rose-600">{apiTokenForm.errors.ability}</p> : null}
                            </div>
                            <Button type="submit" disabled={apiTokenForm.processing}>
                                Create token
                            </Button>
                        </div>
                    </form>

                    <ul className="mt-6 divide-y divide-stone-100 rounded-md border border-stone-200">
                        {apiTokens.length > 0 ? apiTokens.map((token) => (
                            <li key={token.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-stone-950">{token.name}</p>
                                    <p className="truncate text-sm text-stone-500">
                                        {formatTokenAccess(token.abilities)} · Last used: {formatTokenTimestamp(token.last_used_at)}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={apiTokenForm.processing}
                                    onClick={() => {
                                        if (!window.confirm(`Revoke ${token.name}?`)) {
                                            return;
                                        }

                                        router.delete(token.destroy_url, {
                                            preserveScroll: true,
                                        });
                                    }}
                                >
                                    Revoke
                                </Button>
                            </li>
                        )) : (
                            <li className="px-4 py-3 text-sm text-stone-500">No API tokens yet.</li>
                        )}
                    </ul>
                </section>
            </div>
        </AppPage>
    );
}
