import AppPage from '@/Layouts/AppPage';

export function ProjectsFormPage({ title, actions = null, children }) {
    return (
        <AppPage title={title} activeApp="projects" actions={actions} container="form">
            <div className="app-form-page">
                <div className="app-form-page__inner">
                    {children}
                </div>
            </div>
        </AppPage>
    );
}
