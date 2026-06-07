import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppPage from '@/Layouts/AppPage';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';

export default function ClientsIndex({ clients }) {
    const { props } = usePage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: '', address: '' });
    const [isSaving, setIsSaving] = useState(false);

    async function createClient(event) {
        event.preventDefault();

        if (!form.name.trim() || isSaving) {
            return;
        }

        setIsSaving(true);

        try {
            const payload = await request(toAppPath(clients.store_url), {
                method: 'POST',
                body: JSON.stringify({
                    name: form.name.trim(),
                    address: form.address.trim() || null,
                }),
            });

            router.visit(toAppPath(payload.client.show_url));
        } finally {
            setIsSaving(false);
        }
    }

    function changeStatus(status) {
        router.get(toAppPath(props.routes.clients.index), status === 'active' ? {} : { status }, {
            preserveState: true,
            replace: true,
        });
    }

    return (
        <AppPage title="Clients" activeApp="clients" container="wide">
            <div className="projects-app-page">
                <div className="projects-index-toolbar">
                    <div className="projects-index-toolbar__primary">
                        <Select
                            className="projects-index-status-filter"
                            value={clients.status_filter}
                            onChange={(event) => changeStatus(event.target.value)}
                        >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="all">All</option>
                        </Select>
                    </div>
                    <div className="projects-index-actions">
                        <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
                            New client
                        </Button>
                    </div>
                </div>

                <div className="projects-table-shell" data-testid="clients-table">
                    <Table className="projects-table">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Projects</TableHead>
                                <TableHead>Contacts</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(clients.rows ?? []).length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-stone-500">
                                        No clients in this view.
                                    </TableCell>
                                </TableRow>
                            ) : (clients.rows ?? []).map((client) => (
                                <TableRow key={client.id} className={!client.is_active ? 'opacity-70' : undefined}>
                                    <TableCell>
                                        <Link href={toAppPath(client.show_url)} className="font-medium text-stone-900 underline-offset-4 hover:underline">
                                            {client.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="max-w-md whitespace-pre-line text-stone-500">
                                        {client.address || '—'}
                                    </TableCell>
                                    <TableCell>{client.projects_count}</TableCell>
                                    <TableCell>{client.contacts_count}</TableCell>
                                    <TableCell>{client.is_active ? 'Active' : 'Archived'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New client</DialogTitle>
                        <DialogDescription>Create a client before assigning projects.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createClient} className="mt-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-client-name">Client name</Label>
                            <Input
                                id="new-client-name"
                                autoFocus
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="new-client-address">Address</Label>
                            <Textarea
                                id="new-client-address"
                                value={form.address}
                                onChange={(event) => setForm({ ...form, address: event.target.value })}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving || !form.name.trim()}>Create client</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppPage>
    );
}
