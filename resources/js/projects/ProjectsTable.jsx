import { Link } from '@inertiajs/react';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import TableEmptyStateRow from '@/components/data-table/TableEmptyStateRow';
import SortableHeader from '@/components/data-table/SortableHeader';
import { SelectionCheckbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDateDisplay } from '@/lib/formatters';
import { toAppPath } from '@/lib/url';
import { cn } from '@/lib/utils';
import { ProjectActionsDropdown } from '@/projects/ProjectActionsDropdown';

export function ProjectsTable({ isSubmitting = false, rows, selectedIds, onSelectionChange, onProjectAction }) {
    const [sorting, setSorting] = useState([]);

    function toggleRow(projectId, checked) {
        onSelectionChange((current) => checked
            ? Array.from(new Set([...current, projectId]))
            : current.filter((value) => value !== projectId));
    }

    function toggleAll(checked) {
        onSelectionChange(checked ? rows.map((row) => row.id) : []);
    }

    const allRowsSelected = rows.length > 0 && selectedIds.length === rows.length;
    const someRowsSelected = selectedIds.length > 0 && !allRowsSelected;

    const columns = useMemo(() => [
        {
            id: 'select',
            header: () => (
                <SelectionCheckbox
                    checked={someRowsSelected ? 'indeterminate' : allRowsSelected}
                    onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                    aria-label="Select all projects"
                />
            ),
            cell: ({ row }) => (
                <SelectionCheckbox
                    checked={selectedIds.includes(row.original.id)}
                    onCheckedChange={(checked) => toggleRow(row.original.id, Boolean(checked))}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${row.original.name}`}
                />
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
            cell: ({ row }) => (
                <div
                    className={cn(
                        'flex items-center gap-2',
                        row.original.depth === 1 && 'pl-6',
                    )}
                >
                    {row.original.depth === 1 ? <span className="h-px w-3 bg-stone-300" aria-hidden="true" /> : null}
                    <Link
                        href={toAppPath(row.original.show_url)}
                        className={cn(
                            'text-sm text-stone-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300',
                            row.original.depth === 0 && 'font-medium',
                        )}
                    >
                        {row.original.name}
                    </Link>
                    {row.original.is_template ? (
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                            Template
                        </span>
                    ) : null}
                </div>
            ),
            sortingFn: (leftRow, rightRow) => {
                const depthDiff = leftRow.original.depth - rightRow.original.depth;

                if (depthDiff !== 0) {
                    return depthDiff;
                }

                return leftRow.original.name.localeCompare(rightRow.original.name);
            },
        },
        {
            accessorKey: 'start_date',
            header: ({ column }) => <SortableHeader column={column}>Start</SortableHeader>,
            cell: ({ row }) => formatDateDisplay(row.original.start_date),
            sortUndefined: 'last',
        },
        {
            accessorKey: 'end_date',
            header: ({ column }) => <SortableHeader column={column}>End</SortableHeader>,
            cell: ({ row }) => formatDateDisplay(row.original.end_date),
            sortUndefined: 'last',
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-end">
                        <ProjectActionsDropdown
                            disabled={isSubmitting}
                            onAction={onProjectAction}
                            project={row.original}
                        />
                    </div>
                );
            },
            enableSorting: false,
        },
    ], [allRowsSelected, isSubmitting, rows, selectedIds, someRowsSelected, onProjectAction]);

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div data-testid="projects-table" className="projects-table-shell">
            <Table className="projects-table">
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                        <TableEmptyStateRow columnCount={columns.length} message="No projects yet." />
                    ) : table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            aria-selected={selectedIds.includes(row.original.id)}
                            className={cn(
                                'projects-table-row',
                                row.original.depth === 1 && 'projects-table-row-subproject',
                                !row.original.is_active && 'opacity-70',
                            )}
                            data-state={selectedIds.includes(row.original.id) ? 'selected' : undefined}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    className={cn(
                                        cell.column.id === 'name' && 'projects-table-cell-name',
                                    )}
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
