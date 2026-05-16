<?php

namespace App\Filament\Resources\Tasks\Pages;

use App\Filament\Resources\Tasks\TaskResource;
use Filament\Actions\CreateAction;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ManageRecords;

class ManageTasks extends ManageRecords
{
    protected static string $resource = TaskResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()
                ->mutateDataUsing(fn (array $data): array => TaskResource::mutateAssigneeData($data)),
        ];
    }

    protected function configureEditAction(EditAction $action): void
    {
        $action->mutateDataUsing(fn (array $data): array => TaskResource::mutateAssigneeData($data));
    }
}
