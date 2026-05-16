import AppPage from '@/Layouts/AppPage';

export default function AppPlaceholderPage({ title, activeApp, children }) {
    return (
        <AppPage title={title} activeApp={activeApp}>
            <div className="flex w-full flex-1 flex-col px-6 py-6">
                <div className="text-sm leading-6 text-stone-500">
                    {children}
                </div>
            </div>
        </AppPage>
    );
}
