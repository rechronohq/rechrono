import AppPage from '@/Layouts/AppPage';

export function ProjectsFormPage({ title, actions = null, children }) {
    return (
        <AppPage title={title} activeApp="projects" actions={actions} container="wide">
            <div className="projects-app-page projects-form-page">
                {children}
            </div>
        </AppPage>
    );
}
