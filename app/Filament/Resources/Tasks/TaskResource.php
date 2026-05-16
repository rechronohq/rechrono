<?php

namespace App\Filament\Resources\Tasks;

use App\Filament\Resources\Tasks\Pages\ManageTasks;
use App\Models\Task;
use App\Models\User;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\CheckboxColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class TaskResource extends Resource
{
    protected static ?string $model = Task::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBars3BottomLeft;

    protected static ?string $navigationLabel = 'Tasks';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('project_id')
                    ->label('Project')
                    ->relationship('project', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->live(),
                Select::make('parent_id')
                    ->label('Parent Task')
                    ->options(fn ($get, ?Task $record): array => Task::query()
                        ->when($get('project_id'), fn (Builder $query, ?string $projectId) => $query->where('project_id', $projectId))
                        ->when($record?->id, fn (Builder $query, string $taskId) => $query->where('id', '!=', $taskId))
                        ->orderBy('name')
                        ->pluck('name', 'id')
                        ->all())
                    ->searchable()
                    ->preload()
                    ->nullable(),
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                Select::make('assignee_selection')
                    ->label('Assignee')
                    ->options(fn (): array => static::assigneeOptions())
                    ->searchable()
                    ->preload()
                    ->dehydrated(false)
                    ->afterStateHydrated(function (Select $component, ?Task $record): void {
                        $component->state(static::assigneeSelectionState($record));
                    }),
                Textarea::make('description')
                    ->rows(4)
                    ->columnSpanFull(),
                DatePicker::make('start_date')
                    ->required()
                    ->native(false),
                DatePicker::make('end_date')
                    ->required()
                    ->native(false)
                    ->rule('after_or_equal:start_date'),
                Select::make('dependency_id')
                    ->label('Dependency')
                    ->options(fn ($get): array => Task::query()
                        ->when($get('project_id'), fn (Builder $query, ?string $projectId) => $query->where('project_id', $projectId))
                        ->pluck('name', 'id')
                        ->all())
                    ->searchable()
                    ->preload()
                    ->helperText('Single predecessor only in this first version.')
                    ->nullable(),
                TextInput::make('progress')
                    ->numeric()
                    ->minValue(0)
                    ->maxValue(100)
                    ->default(0)
                    ->required(),
                Toggle::make('completed')
                    ->helperText('When enabled, progress is saved as 100%.'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('project.name')
                    ->label('Project')
                    ->sortable()
                    ->searchable(),
                TextColumn::make('parent.name')
                    ->label('Parent')
                    ->sortable()
                    ->searchable(),
                TextColumn::make('assignee_label')
                    ->label('Assignee')
                    ->state(fn (Task $record): string => $record->assigneeLabel() ?? 'Unassigned')
                    ->badge()
                    ->color(fn (Task $record): string => $record->assignee_user_id ? 'info' : 'gray'),
                TextColumn::make('name')
                    ->searchable()
                    ->sortable()
                    ->weight('medium'),
                TextColumn::make('start_date')
                    ->date()
                    ->sortable(),
                TextColumn::make('end_date')
                    ->date()
                    ->sortable(),
                TextColumn::make('dependency.name')
                    ->label('Dependency')
                    ->toggleable(),
                TextColumn::make('progress')
                    ->suffix('%')
                    ->sortable()
                    ->badge()
                    ->color(fn (int $state): string => $state === 100 ? 'success' : 'warning'),
                CheckboxColumn::make('completed')
                    ->label('Done')
                    ->updateStateUsing(function (Task $record, bool $state): void {
                        $record->update([
                            'completed' => $state,
                            'progress' => $state ? 100 : min($record->progress, 99),
                        ]);
                    }),
            ])
            ->filters([
                SelectFilter::make('project')
                    ->relationship('project', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->recordActions([
                EditAction::make()
                    ->mutateDataUsing(fn (array $data): array => static::mutateAssigneeData($data)),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageTasks::route('/'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['project', 'dependency', 'parent', 'assigneeUser']);
    }

    public static function assigneeOptions(): array
    {
        return [
            '' => 'Unassigned',
            ...User::query()
                ->orderBy('name')
                ->pluck('name', 'id')
                ->mapWithKeys(fn (string $name, int|string $id): array => ["user:{$id}" => $name])
                ->all(),
        ];
    }

    public static function assigneeSelectionState(?Task $record): string
    {
        if (! $record) {
            return '';
        }

        return $record->assignee_user_id ? "user:{$record->assignee_user_id}" : '';
    }

    public static function mutateAssigneeData(array $data): array
    {
        $selection = $data['assignee_selection'] ?? '';

        unset($data['assignee_selection']);

        if ($selection === '' || $selection === null) {
            $data['assignee_user_id'] = null;

            return $data;
        }

        $data['assignee_user_id'] = (int) str($selection)->after('user:')->value();

        return $data;
    }
}
