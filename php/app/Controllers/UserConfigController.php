<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\UserConfigModel;

/**
 * UserConfigController
 * Handles GET/POST /api/user-config
 */
class UserConfigController
{
    private UserConfigModel $model;

    public function __construct()
    {
        $this->model = new UserConfigModel();
    }

    // ── GET /api/user-config ──────────────────────────────────────
    public function show(): void
    {
        try {
            $userId   = $_SESSION['user_id'] ?? 0;
            $reportId = Request::query('report_id', 'default');

            if (!$userId) {
                Response::json(['success' => false, 'error' => 'Not authenticated'], 401);
                return;
            }

            $config = $this->model->get($userId, $reportId);

            Response::json([
                'success' => true,
                'config'  => $config,
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── POST /api/user-config ─────────────────────────────────────
    public function store(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 0;
            if (!$userId) {
                Response::json(['success' => false, 'error' => 'Not authenticated'], 401);
                return;
            }

            $raw  = file_get_contents('php://input');
            $data = json_decode($raw, true) ?: [];

            $reportId = $data['report_id'] ?? 'default';
            $config   = $data['column_config'] ?? [];

            $savedConfig = $this->model->save($userId, $reportId, $config);

            Response::json([
                'success' => true,
                'message' => 'Configuration saved.',
                'config'  => $savedConfig,
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
