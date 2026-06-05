<?php

use App\Mcp\Servers\PlannerServer;
use Laravel\Mcp\Facades\Mcp;

Mcp::web('/mcp/planner', PlannerServer::class)->middleware('auth:sanctum');
