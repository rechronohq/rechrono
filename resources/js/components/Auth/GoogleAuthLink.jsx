export default function GoogleAuthLink({ label = 'Continue with Google' }) {
    return (
        <a
            href="/auth/google"
            className="flex h-10 w-full items-center justify-center gap-3 rounded-[6px] border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
        >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-stone-200 bg-white text-xs font-semibold text-blue-600" aria-hidden="true">
                G
            </span>
            {label}
        </a>
    );
}
