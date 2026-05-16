import { Check, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

function Checkbox({ checked = false, onCheckedChange, className, disabled = false, onClick, ...props }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={disabled}
            className={cn(
                'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-white shadow-[0_1px_2px_rgba(28,25,23,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition duration-150 hover:border-blue-300 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-200 disabled:pointer-events-none disabled:opacity-50',
                checked && 'border-blue-500 bg-blue-500 shadow-[0_1px_2px_rgba(37,99,235,0.18)] hover:border-blue-600 hover:bg-blue-600',
                className,
            )}
            {...props}
            onClick={(event) => {
                onClick?.(event);

                if (event.defaultPrevented) {
                    return;
                }

                onCheckedChange?.(!checked);
            }}
        >
            {checked ? <Check className="h-3 w-3 stroke-[3.4]" /> : null}
        </button>
    );
}

function SelectionCheckbox({ checked = false, onCheckedChange, className, disabled = false, onClick, ...props }) {
    const isChecked = checked === true;
    const isIndeterminate = checked === 'indeterminate';

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={isIndeterminate ? 'mixed' : isChecked}
            disabled={disabled}
            className={cn(
                'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-stone-300 bg-white text-white shadow-[0_1px_2px_rgba(28,25,23,0.06)] outline-none transition duration-150 hover:border-blue-300 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-200 disabled:pointer-events-none disabled:opacity-50',
                (isChecked || isIndeterminate) && 'border-blue-500 bg-blue-500 shadow-[0_1px_2px_rgba(37,99,235,0.18)] hover:border-blue-600 hover:bg-blue-600',
                className,
            )}
            {...props}
            onClick={(event) => {
                onClick?.(event);

                if (event.defaultPrevented) {
                    return;
                }

                onCheckedChange?.(isChecked ? false : true);
            }}
        >
            {isIndeterminate ? <Minus className="h-3 w-3 stroke-[3.2]" /> : null}
            {isChecked ? <Check className="h-3 w-3 stroke-[3.2]" /> : null}
        </button>
    );
}

export { Checkbox, SelectionCheckbox };
