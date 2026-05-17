import { router, usePage } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import AppPage from '@/Layouts/AppPage';
import { HiveImportDialog } from '@/Pages/Timeline/HiveImportDialog';
import { buildFileUploadFormData, requestErrorMessages, requestFieldErrors } from '@/Pages/Timeline/utils';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';

export default function ImportsIndex({ importRoutes = {} }) {
    const { props } = usePage();
    const [hiveImportOpen, setHiveImportOpen] = useState(false);
    const [hiveImportState, setHiveImportState] = useState(defaultHiveImportState);

    function openHiveImportDialog() {
        setHiveImportState(defaultHiveImportState());
        setHiveImportOpen(true);
    }

    function closeHiveImportDialog(open) {
        if (open === false) {
            setHiveImportState(defaultHiveImportState());
        }

        setHiveImportOpen(Boolean(open));
    }

    function setHiveImportFile(file) {
        setHiveImportState((current) => ({
            ...current,
            file: file ?? null,
            result: null,
            resultNotice: '',
            errors: [],
            fieldErrors: {},
        }));
    }

    function applyHiveImportError(error) {
        const nextFieldErrors = requestFieldErrors(error);
        const nextErrors = requestErrorMessages(error).filter(
            (message) => !(nextFieldErrors.file ?? []).includes(message),
        );

        setHiveImportState((current) => ({
            ...current,
            errors: nextErrors,
            fieldErrors: nextFieldErrors,
        }));
    }

    async function submitHiveImportFromDialog() {
        if (!hiveImportState.file) {
            setHiveImportState((current) => ({
                ...current,
                errors: [],
                fieldErrors: {
                    ...current.fieldErrors,
                    file: ['Choose a Hive CSV file to import.'],
                },
            }));

            return;
        }

        setHiveImportState((current) => ({
            ...current,
            result: null,
            resultNotice: '',
            errors: [],
            fieldErrors: {},
            isSubmitting: true,
        }));

        try {
            const result = await request(importRoutes.hive_store ?? props.routes?.importsHiveStore ?? toAppPath('/imports/hive'), {
                method: 'POST',
                body: buildFileUploadFormData(hiveImportState.file),
            });

            setHiveImportState((current) => ({
                ...current,
                file: null,
                result,
                resultNotice: 'Projects refreshed with imported Hive data.',
                errors: [],
                fieldErrors: {},
            }));

            router.reload({
                preserveScroll: true,
                preserveState: true,
            });
        } catch (error) {
            applyHiveImportError(error);
        } finally {
            setHiveImportState((current) => ({
                ...current,
                isSubmitting: false,
            }));
        }
    }

    return (
        <AppPage title="Imports" activeApp="projects" container="wide">
            <div className="projects-app-page imports-page">
                <section className="imports-hero">
                    <div>
                        <p className="imports-eyebrow">External data</p>
                        <h1 className="imports-title">Imports</h1>
                        <p className="imports-copy">
                            Bring project and task data from external systems into Rechrono. Choose a source to start an import.
                        </p>
                    </div>
                </section>

                <section className="imports-provider-section" aria-labelledby="imports-provider-title">
                    <div className="imports-section-header">
                        <div>
                            <h2 id="imports-provider-title">Available importers</h2>
                            <p>Start with Hive CSV today. More sources can be added here as they become available.</p>
                        </div>
                    </div>

                    <div className="imports-provider-grid">
                        <article className="imports-provider-card">
                            <div className="imports-provider-card__header">
                                <div className="imports-provider-card__icon" aria-hidden="true">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <span className="imports-provider-card__badge">Available</span>
                            </div>
                            <div>
                                <h3>Hive CSV</h3>
                                <p>Import projects, tasks, and assignee matches from an original Hive CSV export.</p>
                            </div>
                            <Button type="button" onClick={openHiveImportDialog}>
                                Import Hive CSV
                            </Button>
                        </article>

                        <article className="imports-provider-card imports-provider-card-disabled" aria-disabled="true">
                            <div className="imports-provider-card__header">
                                <div className="imports-provider-card__icon" aria-hidden="true">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <span className="imports-provider-card__badge">Later</span>
                            </div>
                            <div>
                                <h3>More sources</h3>
                                <p>Future importers will live here so importing stays separate from day-to-day project management.</p>
                            </div>
                            <Button type="button" variant="outline" disabled>
                                Coming soon
                            </Button>
                        </article>
                    </div>
                </section>
            </div>

            <HiveImportDialog
                onClose={closeHiveImportDialog}
                onFileChange={setHiveImportFile}
                onSubmit={submitHiveImportFromDialog}
                open={hiveImportOpen}
                state={hiveImportState}
            />
        </AppPage>
    );
}

function defaultHiveImportState() {
    return {
        file: null,
        result: null,
        resultNotice: '',
        errors: [],
        fieldErrors: {},
        isSubmitting: false,
    };
}
