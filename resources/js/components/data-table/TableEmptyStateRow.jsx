import { TableCell, TableRow } from '@/components/ui/table';

export default function TableEmptyStateRow({ columnCount, message }) {
    return (
        <TableRow>
            <TableCell colSpan={columnCount} className="py-12 text-center text-sm text-stone-500">
                {message}
            </TableCell>
        </TableRow>
    );
}
