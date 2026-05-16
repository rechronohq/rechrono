import React from 'react';
import { usePage } from '@inertiajs/react';

import AppPage from '@/Layouts/AppPage';
import { TasksContextBar } from '@/tasks/TasksContextBar';
import { TasksSidebar } from '@/tasks/TasksSidebar';
import { useTasksBoard } from '@/tasks/useTasksBoard';

import { GroupDialog } from '../Timeline/GroupDialog';
import { ProjectDialog } from '../Timeline/ProjectDialog';
import { ProjectEditorDialog } from '../Timeline/ProjectEditorDialog';
import { TimelineCanvas } from '../Timeline/TimelineCanvas';
import { TaskDialog } from '../Timeline/TaskDialog';

export default function TasksIndex({ timelineData, createTaskUrlTemplate, duplicateTaskUrlTemplate, reorderTaskUrlTemplate, updateTaskUrlTemplate }) {
    const { props } = usePage();
    const activeTimelineView = (props.timelineViews ?? []).find((view) => view.id === props.activeTimelineViewId) ?? null;
    const board = useTasksBoard({
        activeTimelineView,
        timelineData,
        routes: props.routes ?? {},
        createTaskUrlTemplate,
        duplicateTaskUrlTemplate,
        reorderTaskUrlTemplate,
        updateTaskUrlTemplate,
    });
    const timelineLayoutStyle = {
        '--timeline-day-height': `${board.timelineDensity.dayHeight}px`,
        '--timeline-header-height': `${board.timelineDensity.headerHeight}px`,
        '--timeline-month-height': `${board.timelineDensity.monthHeight}px`,
        '--timeline-row-height': `${board.timelineDensity.rowHeight}px`,
    };

    return (
        <AppPage
            title="Tasks"
            activeApp="tasks"
            contextBar={(
                <TasksContextBar
                    assigneeOptions={board.data.assignee_options ?? []}
                    breadcrumbs={board.breadcrumbs}
                    filtersOpen={board.filtersOpen}
                    onOpenProjectForm={board.openProjectForm}
                    onSelectAllAssignees={board.selectAllAssignees}
                    onSelectAllProjects={board.selectAllProjects}
                    onSelectProject={board.selectSingleProject}
                    onSaveView={board.saveTimelineView}
                    onToggleWeekends={board.setShowWeekends}
                    onViewDensityChange={board.setTimelineDensity}
                    onToggleFilters={board.setFiltersOpen}
                    onToggleAssigneeSelection={board.toggleAssigneeSelection}
                    onToggleProjectSelection={board.toggleProjectSelection}
                    projects={board.data.projects}
                    selectedAssigneeFilters={board.data.selected_assignee_filters ?? []}
                    selectedProjectIds={board.data.selected_project_ids}
                    showWeekends={board.data.show_weekends ?? false}
                    viewDensity={board.timelineDensity.key}
                />
            )}
        >
            <div
                className="timeline-shell flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-white"
                data-density={board.timelineDensity.key}
                style={timelineLayoutStyle}
            >
                <div className="timeline-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white">
                    <div className="timeline-sidebar-pane">
                        <TasksSidebar
                            collapsedGroupIds={board.collapsedGroupIds}
                            drafts={board.drafts}
                            focusedComposerParentId={board.focusedComposerParentId}
                            hoveredTaskId={board.hoveredTaskId}
                            isSaving={board.isSaving}
                            layoutStyle={timelineLayoutStyle}
                            collapsedProjectIds={board.collapsedProjectIds}
                            maxDepth={board.maxDepth}
                            onConvertTaskToGroup={board.convertTaskToGroup}
                            onCreateGroup={board.openGroupCreate}
                            onClearSelection={board.clearSidebarSelection}
                            onDraftChange={(key, value) => board.setDrafts((previous) => ({ ...previous, [key]: value }))}
                            onDeleteProject={board.deleteProject}
                            onDeleteTask={board.deleteTask}
                            onDuplicateProject={board.duplicateProject}
                            onDuplicateTask={board.duplicateTask}
                            onMarkSelectionComplete={() => board.markSelectedSidebarItems(true)}
                            onMarkSelectionIncomplete={() => board.markSelectedSidebarItems(false)}
                            onOpenProjectModal={board.openProjectModal}
                            onReorderTasks={board.reorderTaskSet}
                            onRowClick={board.handleSidebarItemClick}
                            onSelectProject={board.selectSingleProject}
                            onSaveProjectAsTemplate={board.saveProjectAsTemplate}
                            onSetSingleSelection={board.setSingleSidebarSelection}
                            onSubmitTask={board.submitTask}
                            onTaskClick={board.openTaskModal}
                            onToggleGroupCollapse={board.toggleGroupCollapse}
                            onToggleProjectCollapse={board.toggleProjectCollapse}
                            onToggleComposer={board.toggleComposer}
                            onToggleTaskCompletion={board.markTaskCompletion}
                            projectCanCollapse={board.projectCanCollapse}
                            itemHasChildren={board.itemHasChildren}
                            rootComposerKey={board.rootComposerKey}
                            rows={board.rows}
                            selectedItemIds={board.selectedSidebarItemIds}
                            selectedRootIds={board.selectedSidebarRootIds}
                            taskCanAddChildren={board.taskCanAddChildren}
                        />
                    </div>

                    <div className="timeline-canvas-pane min-w-0 flex-1">
                        <TimelineCanvas
                            assigneeOptions={board.data.assignee_options ?? []}
                            bars={board.bars}
                            compressedBreaks={board.layout.compressedBreaks ?? []}
                            days={board.layout.days}
                            dependencyDragState={board.dependencyDragState}
                            dimensions={board.timelineDensity}
                            hoveredTaskId={board.hoveredTaskId}
                            months={board.layout.months}
                            onTaskAssigneeChange={board.updateTaskAssignee}
                            onHoverTaskChange={board.setHoveredTaskId}
                            onOpenProjectModal={board.openProjectModal}
                            onStartDrag={board.startDrag}
                            onTaskClick={board.openTaskModal}
                            rows={board.rows}
                            timelineWidth={board.timelineWidth}
                        />
                    </div>
                </div>

                <ProjectDialog
                    isSaving={board.isSaving}
                    onClose={board.setProjectFormOpen}
                    onProjectFormChange={(field, value) => board.setProjectForm((previous) => ({ ...previous, [field]: value }))}
                    onSubmit={board.submitProject}
                    open={board.projectFormOpen}
                    projectForm={board.projectForm}
                    projects={board.data.projects}
                    templateProjects={board.data.template_projects ?? []}
                />

                <TaskDialog
                    assigneeOptions={board.data.assignee_options ?? []}
                    isSaving={board.isSaving}
                    onClose={board.closeTaskModal}
                    onDelete={board.removeTaskFromModal}
                    onDuplicate={board.duplicateTaskFromModal}
                    onFieldChange={board.setTaskModalField}
                    onSubmit={board.submitTaskModal}
                    open={board.taskModalOpen}
                    parentTaskOptions={board.taskModalParentOptions}
                    projectOptions={board.data.projects}
                    value={board.taskModalForm}
                />

                <GroupDialog
                    isSaving={board.isSaving}
                    mode={board.groupModalGroupId ? 'edit' : 'create'}
                    onClose={board.closeGroupModal}
                    onDelete={board.removeGroupFromModal}
                    onDuplicate={board.duplicateGroupFromModal}
                    onFieldChange={board.setGroupModalField}
                    onSubmit={board.submitGroupModal}
                    open={board.groupModalOpen}
                    projectOptions={board.data.projects}
                    value={board.groupModalForm}
                />

                <ProjectEditorDialog
                    isSaving={board.isSaving}
                    onClose={board.closeProjectModal}
                    onArchive={board.archiveProjectFromModal}
                    onDelete={board.removeProjectFromModal}
                    onDuplicate={board.duplicateProjectFromModal}
                    onSaveAsTemplate={board.saveProjectAsTemplateFromModal}
                    onFieldChange={board.setProjectModalField}
                    onSubmit={board.submitProjectModal}
                    open={board.projectModalOpen}
                    project={board.data.projects.find((project) => project.id === board.projectModalProjectId)}
                    projects={board.data.projects}
                    value={board.projectModalForm}
                />
            </div>
        </AppPage>
    );
}
