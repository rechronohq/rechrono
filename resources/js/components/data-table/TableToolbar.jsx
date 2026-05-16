import { cn } from '@/lib/utils';

export default function TableToolbar({ left, right, className, leftClassName, rightClassName }) {
    return (
        <div className={cn('table-toolbar', className)}>
            <div className={cn('table-toolbar__left', leftClassName)}>
                {left}
            </div>
            <div className={cn('table-toolbar__right', rightClassName)}>
                {right}
            </div>
        </div>
    );
}
