function formatHours(value) {
    const hours = Number(value);

    if (!Number.isFinite(hours)) {
        return '0h';
    }

    return `${new Intl.NumberFormat('en-CA', {
        maximumFractionDigits: 2,
        minimumFractionDigits: Number.isInteger(hours) ? 0 : 1,
    }).format(hours)}h`;
}

export function projectTimeBudget(project) {
    const budgetHours = Number(project?.budget_hours);

    if (!Number.isFinite(budgetHours) || budgetHours <= 0) {
        return null;
    }

    const actualHours = Number(project?.actual_hours ?? 0);
    const normalizedActualHours = Number.isFinite(actualHours) ? Math.max(0, actualHours) : 0;
    const percent = Math.round((normalizedActualHours / budgetHours) * 100);

    return {
        actualLabel: formatHours(normalizedActualHours),
        budgetLabel: formatHours(budgetHours),
        percent,
        percentLabel: `${percent}%`,
    };
}
