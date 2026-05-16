<?php

namespace App\Http\Controllers;

use App\Imports\Hive\HiveCsvImportPreviewService;
use App\Imports\Hive\HiveCsvImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class HiveImportController extends Controller
{
    public function __construct(
        protected HiveCsvImportPreviewService $previewService,
        protected HiveCsvImportService $importService,
    ) {}

    public function preview(Request $request): JsonResponse
    {
        $validated = $this->validatedFile($request);

        try {
            $preview = $this->previewService->preview($validated['file']);
        } catch (InvalidArgumentException $exception) {
            $this->throwFileValidationException($exception);
        }

        return response()->json($preview);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedFile($request);

        try {
            $result = $this->importService->import($validated['file']);
        } catch (InvalidArgumentException $exception) {
            $this->throwFileValidationException($exception);
        }

        return response()->json($result);
    }

    protected function validatedFile(Request $request): array
    {
        return Validator::make($request->all(), [
            'file' => ['required', 'file', 'extensions:csv'],
        ])->validate();
    }

    protected function throwFileValidationException(InvalidArgumentException $exception): never
    {
        throw ValidationException::withMessages([
            'file' => $exception->getMessage(),
        ]);
    }
}
