import { Head } from '@inertiajs/react';

export default function AuthLayout({ title, subtitle, children }) {
    return (
        <>
            <Head title={title} />
            <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative hidden overflow-hidden border-r border-stone-200 bg-stone-950 text-white lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_38%),linear-gradient(160deg,_rgba(255,255,255,0.03),_transparent_48%)]" />
                    <div className="relative px-10 py-8">
                        <div className="text-lg font-semibold tracking-[-0.04em]">Rechrono</div>
                    </div>
                    <div className="relative max-w-xl px-10 pb-14">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Planner</p>
                        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-white">Nested scheduling for people who live in the timeline.</h1>
                        <p className="mt-4 text-base leading-7 text-white/65">
                            Projects, subtasks, drag scheduling, and multi-board views in one workspace.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center px-6 py-10 sm:px-8">
                    <div className="w-full max-w-md space-y-8">
                        <div>
                            <div className="text-lg font-semibold tracking-[-0.04em] text-stone-950 lg:hidden">Rechrono</div>
                            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-stone-950">{title}</h2>
                            {subtitle ? <p className="mt-2 text-sm leading-6 text-stone-500">{subtitle}</p> : null}
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
