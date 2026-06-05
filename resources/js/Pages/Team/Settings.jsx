import { Link, router, useForm, usePage } from '@inertiajs/react';

import AppPage from '@/Layouts/AppPage';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const settingsSections = [
    { id: 'workspace-profile', label: 'Workspace profile' },
    { id: 'modules', label: 'Modules' },
    { id: 'members', label: 'Members' },
    { id: 'api-tokens', label: 'API tokens' },
];

function SettingsSectionNavigation({ activeSection, routes = {}, compact = false }) {
    return (
        <nav
            aria-label="Team settings sections"
            data-testid={compact ? 'team-settings-mobile-nav' : 'team-settings-subnav'}
            className={cn(
                compact
                    ? 'flex gap-2 overflow-x-auto border-b border-stone-200 bg-white px-6 py-3 lg:hidden'
                    : 'hidden w-56 flex-col border-r border-stone-200 bg-stone-50/60 px-3 py-5 lg:flex',
            )}
        >
            {!compact ? (
                <div className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                    Team settings
                </div>
            ) : null}
            <div className={cn(compact ? 'flex gap-2' : 'space-y-1')}>
                {settingsSections.map((section) => {
                    const isActive = activeSection === section.id;

                    return (
                        <Link
                            key={section.id}
                            href={routes[section.id] ?? '#'}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'whitespace-nowrap text-left text-sm transition',
                                compact ? 'border-b px-0 py-1.5' : 'block border-l px-3 py-1.5',
                                isActive
                                    ? 'border-stone-950 font-medium text-stone-950'
                                    : 'border-transparent text-stone-500 hover:text-stone-950',
                            )}
                        >
                            {section.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

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

export default function TeamSettings({ team, members, activeSection = 'workspace-profile', apiTokens = [], newApiToken = null, teamSettingsRoutes }) {
    const { auth, flash } = usePage().props;
    const isOwner = auth.team?.is_owner ?? false;
    const teamForm = useForm({
        name: team.name,
        slug: team.slug,
        time_tracking_enabled: Boolean(team.time_tracking_enabled),
        section: activeSection,
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

    function updateTimeTracking(checked) {
        const nextValue = Boolean(checked);

        teamForm.setData('time_tracking_enabled', nextValue);
        router.patch(teamSettingsRoutes.teamSettingsUpdate, {
            name: teamForm.data.name,
            slug: teamForm.data.slug,
            time_tracking_enabled: nextValue,
            section: 'modules',
        }, {
            preserveScroll: true,
        });
    }

    const sectionNavigation = (
        <SettingsSectionNavigation
            activeSection={activeSection}
            routes={teamSettingsRoutes.settingsSections}
        />
    );

    return (
        <AppPage title="Team settings" activeApp="settings" secondarySidebar={sectionNavigation}>
            <SettingsSectionNavigation
                activeSection={activeSection}
                routes={teamSettingsRoutes.settingsSections}
                compact
            />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
                {flash?.status && statusMessages[flash.status] ? (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {statusMessages[flash.status]}
                    </p>
                ) : null}

                {activeSection === 'workspace-profile' ? (
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!isOwner) {
                                return;
                            }

                            teamForm.setData('section', activeSection);
                            teamForm.patch(teamSettingsRoutes.teamSettingsUpdate);
                        }}
                    >
                            <section className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-stone-950">Team profile</h2>
                            <p className="mt-1 text-sm text-stone-500">Core identity and URL settings for this team.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="team-name" className="text-sm font-medium text-stone-700">Team name</label>
                                <Input
                                    id="team-name"
                                    value={teamForm.data.name}
                                    onChange={(event) => teamForm.setData('name', event.target.value)}
                                    disabled={!isOwner}
                                />
                                {teamForm.errors.name ? <p className="text-sm text-rose-600">{teamForm.errors.name}</p> : null}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="team-slug" className="text-sm font-medium text-stone-700">Team URL</label>
                                <div className="flex items-center gap-2">
                                    <span className="shrink-0 text-sm text-stone-400">/</span>
                                    <Input
                                        id="team-slug"
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

                        {isOwner ? (
                            <div className="flex justify-end">
                                <Button type="submit" disabled={teamForm.processing}>Save team settings</Button>
                            </div>
                        ) : null}
                    </form>
                ) : null}

                {activeSection === 'modules' ? (
                    <section className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-stone-950">Modules</h2>
                            <p className="mt-1 text-sm text-stone-500">Turn optional team apps and workflows on or off.</p>
                        </div>

                        <div className="border-t border-stone-200">
                            <label className="flex items-start gap-4 border-b border-stone-200 py-4">
                                <Checkbox
                                    checked={teamForm.data.time_tracking_enabled}
                                    onCheckedChange={updateTimeTracking}
                                    disabled={!isOwner}
                                    aria-label="Enable time tracking"
                                    className="mt-1"
                                />
                                <span className="min-w-0">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="text-base font-semibold text-stone-950">Time tracking</span>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                isTimeTrackingEnabled
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-stone-100 text-stone-600'
                                            }`}
                                        >
                                            {isTimeTrackingEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </span>
                                    <span className="mt-1 block max-w-2xl text-sm leading-6 text-stone-600">
                                        Adds task timers, a Timesheet app, editable weekly entries, and project actuals against budget hours.
                                    </span>
                                    {!isOwner ? (
                                        <span className="mt-1 block text-sm text-stone-500">Owner only</span>
                                    ) : null}
                                </span>
                            </label>
                        </div>
                    </section>
                ) : null}

                {activeSection === 'members' ? (
                    <section className="space-y-6">
                    <div>
                            <h2 className="text-2xl font-semibold text-stone-950">Members</h2>
                            <p className="mt-1 text-sm text-stone-500">People who can access this team workspace.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table aria-label="Team members" className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-400">
                                    <th scope="col" className="py-2 pr-4">Name</th>
                                    <th scope="col" className="px-4 py-2">Email</th>
                                    <th scope="col" className="px-4 py-2">Status</th>
                                    <th scope="col" className="py-2 pl-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {members.map((member) => (
                                    <tr key={`${member.type}-${member.id}`}>
                                        <td className="py-3 pr-4 font-medium text-stone-950">
                                            {member.type === 'invitation' ? 'Invited member' : member.name}
                                        </td>
                                        <td className="px-4 py-3 text-stone-600">{member.email}</td>
                                        <td className="px-4 py-3">
                                            {member.is_owner ? (
                                                <span className="text-stone-600">Owner</span>
                                            ) : member.type === 'invitation' ? (
                                                <span className="text-amber-700">Invited</span>
                                            ) : (
                                                <span className="text-stone-500">Member</span>
                                            )}
                                        </td>
                                        <td className="py-3 pl-4 text-right">
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

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
                                <Button type="submit" variant="outline" disabled={inviteForm.processing} className="sm:mb-0">
                                    Send invitation
                                </Button>
                            </div>
                        </form>
                    ) : null}
                    </section>
                ) : null}

                {activeSection === 'api-tokens' ? (
                    <section className="space-y-6">
                    <div>
                            <h2 className="text-2xl font-semibold text-stone-950">API tokens</h2>
                            <p className="mt-1 text-sm text-stone-500">
                                Create personal tokens for API clients and integrations.
                            </p>
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
                            <Button type="submit" variant="outline" disabled={apiTokenForm.processing}>
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
                ) : null}
            </div>
        </AppPage>
    );
}
