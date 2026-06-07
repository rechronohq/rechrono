<?php

namespace App\Http\Requests\Concerns;

use App\Models\Project;
use App\Models\Team;
use Illuminate\Validation\Rule;

trait ValidatesPlannerScope
{
    protected function currentTeam(): ?Team
    {
        $team = $this->route('team');

        return $team instanceof Team ? $team : null;
    }

    protected function currentProject(): ?Project
    {
        $project = $this->route('project');

        return $project instanceof Project ? $project : null;
    }

    protected function teamProjectRule(): mixed
    {
        return Rule::exists('projects', 'id')
            ->where(fn ($query) => $query->where('team_id', $this->currentTeam()?->id));
    }

    protected function teamTemplateProjectRule(): mixed
    {
        return Rule::exists('projects', 'id')
            ->where(fn ($query) => $query
                ->where('team_id', $this->currentTeam()?->id)
                ->where('is_template', true));
    }

    protected function projectTaskRule(): mixed
    {
        return Rule::exists('tasks', 'id')
            ->where(fn ($query) => $query->where('project_id', $this->currentProject()?->id));
    }

    protected function teamTaskRule(): mixed
    {
        return Rule::exists('tasks', 'id')
            ->where(fn ($query) => $query->whereIn('project_id', function ($subquery): void {
                $subquery
                    ->select('id')
                    ->from('projects')
                    ->where('team_id', $this->currentTeam()?->id);
            }));
    }

    protected function teamUserRule(): mixed
    {
        return Rule::exists('users', 'id')
            ->where(fn ($query) => $query->where('team_id', $this->currentTeam()?->id));
    }

    protected function activeTeamClientRule(): mixed
    {
        return Rule::exists('clients', 'id')
            ->where(fn ($query) => $query
                ->where('team_id', $this->currentTeam()?->id)
                ->where('is_active', true));
    }

    protected function teamClientRuleAllowingCurrentProject(): mixed
    {
        return Rule::exists('clients', 'id')
            ->where(fn ($query) => $query
                ->where('team_id', $this->currentTeam()?->id)
                ->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->when(
                        $this->currentProject()?->client_id,
                        fn ($query, $clientId) => $query->orWhere('id', $clientId),
                    )));
    }
}
