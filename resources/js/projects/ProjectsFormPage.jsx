import AppPage from '@/Layouts/AppPage';

export function ProjectsFormPage({ title, actions = null, context = null, children }) {
    return (
        <AppPage title={title} activeApp="projects" actions={actions} context={context} container="wide">
            <div className="projects-app-page projects-form-page">
                {children}
            </div>
        </AppPage>
    );
}
