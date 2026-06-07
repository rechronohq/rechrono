import { Link, router, usePage } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import AppBreadcrumb from '@/components/AppBreadcrumb';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppPage from '@/Layouts/AppPage';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';

const emptyContact = { id: null, name: '', email: '', job_title: '' };

export default function ClientShow({ client }) {
    const { props } = usePage();
    const [details, setDetails] = useState({ name: client.name, address: client.address ?? '', is_active: client.is_active });
    const [contact, setContact] = useState(emptyContact);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function saveDetails(event) {
        event.preventDefault();
        setIsSaving(true);

        try {
            await request(toAppPath(client.update_url), {
                method: 'PATCH',
                body: JSON.stringify({ ...details, address: details.address.trim() || null }),
            });
            setDetailsOpen(false);
            router.reload({ preserveScroll: true });
        } finally {
            setIsSaving(false);
        }
    }

    async function toggleArchive() {
        await request(toAppPath(client.update_url), {
            method: 'PATCH',
            body: JSON.stringify({
                name: details.name,
                address: details.address || null,
                is_active: !client.is_active,
            }),
        });
        router.reload({ preserveScroll: true });
    }

    async function deleteClient() {
        if (!window.confirm(`Delete "${client.name}"? This cannot be undone.`)) {
            return;
        }

        await request(toAppPath(client.destroy_url), { method: 'DELETE' });
        router.visit(toAppPath(props.routes.clients.index));
    }

    async function saveContact(event) {
        event.preventDefault();

        if (!contact.name.trim()) {
            return;
        }

        const existing = client.contacts.find((item) => item.id === contact.id);
        await request(toAppPath(existing?.update_url ?? client.contacts_store_url), {
            method: existing ? 'PATCH' : 'POST',
            body: JSON.stringify({
                name: contact.name.trim(),
                email: contact.email.trim() || null,
                job_title: contact.job_title.trim() || null,
            }),
        });
        setContact(emptyContact);
        setContactOpen(false);
        router.reload({ preserveScroll: true });
    }

    async function deleteContact(item) {
        await request(toAppPath(item.destroy_url), { method: 'DELETE' });
        router.reload({ preserveScroll: true });
    }

    function editContact(item) {
        setContact({ ...item, email: item.email ?? '', job_title: item.job_title ?? '' });
        setContactOpen(true);
    }

    const context = (
        <AppBreadcrumb items={[
            { label: 'All clients', href: toAppPath(props.routes.clients.index) },
            { label: client.name },
        ]} />
    );

    return (
        <AppPage title="Clients" activeApp="clients" container="wide" context={context}>
            <div className="projects-detail-page" data-testid="client-detail">
                <div className="projects-detail-intro">
                    <div className="projects-detail-intro__heading">
                        <h1 className="projects-detail-title">{client.name}</h1>
                        {!client.is_active ? <span className="projects-detail-status">Archived</span> : null}
                    </div>
                    <div className="projects-detail-actions">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" aria-label={`More actions for ${client.name}`}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>Edit client</DropdownMenuItem>
                                <DropdownMenuItem onSelect={toggleArchive}>
                                    {client.is_active ? 'Archive' : 'Unarchive'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    disabled={client.projects.length > 0}
                                    onSelect={deleteClient}
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <section className="projects-detail-hero">
                    <div className="projects-detail-hero__content">
                        <p className="projects-detail-description whitespace-pre-line">{client.address || 'No address added.'}</p>
                    </div>
                    <div className="projects-detail-hero__panel" aria-label="Client summary">
                        <dl className="projects-detail-summary-grid">
                            <div className="projects-detail-summary-card">
                                <dt>Projects</dt>
                                <dd>{client.projects.length}</dd>
                            </div>
                            <div className="projects-detail-summary-card">
                                <dt>Contacts</dt>
                                <dd>{client.contacts.length}</dd>
                            </div>
                        </dl>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="projects-detail-section__header">
                        <div>
                            <h2 className="projects-detail-section__heading">Contacts</h2>
                            <p className="projects-detail-section__copy">People connected to this client.</p>
                        </div>
                        <Button type="button" size="sm" onClick={() => { setContact(emptyContact); setContactOpen(true); }}>Add contact</Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Name</TableHead><TableHead>Job title</TableHead><TableHead>Email</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {client.contacts.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="py-10 text-center text-stone-500">No contacts yet.</TableCell></TableRow>
                            ) : client.contacts.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell><button type="button" className="font-medium text-stone-900 hover:underline" onClick={() => editContact(item)}>{item.name}</button></TableCell>
                                    <TableCell>{item.job_title || '—'}</TableCell>
                                    <TableCell>{item.email || '—'}</TableCell>
                                    <TableCell className="text-right"><Button type="button" variant="ghost" size="sm" onClick={() => deleteContact(item)}>Delete</Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>

                <section className="space-y-4 border-t border-stone-200 pt-7">
                    <div className="projects-detail-section__header">
                        <div>
                            <h2 className="projects-detail-section__heading">Projects</h2>
                            <p className="projects-detail-section__copy">Root projects assigned to this client.</p>
                        </div>
                    </div>
                    <Table>
                        <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Name</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {client.projects.length === 0 ? (
                                <TableRow><TableCell colSpan={2} className="py-10 text-center text-stone-500">No root projects assigned.</TableCell></TableRow>
                            ) : client.projects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell><Link href={toAppPath(project.show_url)} className="font-medium text-stone-900 hover:underline">{project.name}</Link></TableCell>
                                    <TableCell>{project.is_active ? 'Active' : 'Archived'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>
            </div>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit client</DialogTitle><DialogDescription>Update the client name and address.</DialogDescription></DialogHeader>
                    <form onSubmit={saveDetails} className="mt-5 space-y-4">
                        <div className="space-y-1.5"><Label htmlFor="edit-client-name">Client name</Label><Input id="edit-client-name" value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} /></div>
                        <div className="space-y-1.5"><Label htmlFor="edit-client-address">Address</Label><Textarea id="edit-client-address" value={details.address} onChange={(event) => setDetails({ ...details, address: event.target.value })} /></div>
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setDetailsOpen(false)}>Cancel</Button><Button type="submit" disabled={isSaving || !details.name.trim()}>Save client</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{contact.id ? 'Edit contact' : 'Add contact'}</DialogTitle><DialogDescription>Store a simple client contact.</DialogDescription></DialogHeader>
                    <form onSubmit={saveContact} className="mt-5 space-y-4">
                        <div className="space-y-1.5"><Label htmlFor="contact-name">Contact name</Label><Input id="contact-name" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></div>
                        <div className="space-y-1.5"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></div>
                        <div className="space-y-1.5"><Label htmlFor="contact-job-title">Job title</Label><Input id="contact-job-title" value={contact.job_title} onChange={(event) => setContact({ ...contact, job_title: event.target.value })} /></div>
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setContactOpen(false)}>Cancel</Button><Button type="submit" disabled={!contact.name.trim()}>{contact.id ? 'Save contact' : 'Add contact'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppPage>
    );
}
