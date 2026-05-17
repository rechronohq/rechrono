<?php

namespace App\Filament\Resources\Projects;

use App\Filament\Resources\Projects\Pages\ManageProjects;
use App\Models\Project;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ProjectResource extends Resource
{
    protected static ?string $model = Project::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $navigationLabel = 'Projects';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                Select::make('parent_id')
                    ->label('Parent Project')
                    ->options(fn (?Project $record): array => Project::query()
                        ->roots()
                        ->plannerVisible()
                        ->when($record?->id, fn (Builder $query, string $projectId) => $query->where('id', '!=', $projectId))
                        ->orderBy('name')
                        ->pluck('name', 'id')
                        ->all())
                    ->searchable()
                    ->preload()
                    ->nullable()
                    ->helperText('Optional one-level parent project.'),
                Toggle::make('is_template')
                    ->label('Template project')
                    ->helperText('Template projects stay out of the main planner board and can be used to create new projects.'),
                Textarea::make('description')
                    ->rows(4)
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable()
                    ->weight('medium'),
                TextColumn::make('parent.name')
                    ->label('Parent')
                    ->sortable()
                    ->toggleable(),
                TextColumn::make('is_template')
                    ->label('Template')
                    ->badge()
                    ->formatStateUsing(fn (bool $state): string => $state ? 'Template' : 'Project')
                    ->color(fn (bool $state): string => $state ? 'info' : 'gray'),
                TextColumn::make('tasks_count')
                    ->label('Tasks')
                    ->badge()
                    ->color('warning'),
                TextColumn::make('updated_at')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->label('Updated'),
            ])
            ->filters([
            ])
            ->recordActions([
                Action::make('timeline')
                    ->icon(Heroicon::OutlinedCalendarDays)
                    ->url(fn (Project $record): string => route('projects.timeline', [$record->team, $record])),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['parent'])->withCount('tasks');
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageProjects::route('/'),
        ];
    }
}
