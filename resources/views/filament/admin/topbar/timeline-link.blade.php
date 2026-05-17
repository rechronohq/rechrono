<div class="ms-2">
    <x-filament::button
        color="gray"
        tag="a"
        :href="auth()->user()?->team ? route('tasks', auth()->user()->team) : route('login')"
        :icon="\Filament\Support\Icons\Heroicon::OutlinedCalendarDays"
    >
        Back to timeline
    </x-filament::button>
</div>
