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
            $userId   = (int) Request::query('user_id', '1');
            $reportId = Request::query('report_id', 'default');

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
            $raw  = file_get_contents('php://input');
            $data = json_decode($raw, true) ?: [];

            if (empty($data['report_id'])) {
                $data['report_id'] = 'default';
            }
            if (empty($data['user_id'])) {
                $data['user_id'] = 1;
            }

            $config = $this->model->save($data);

            Response::json([
                'success' => true,
                'message' => 'Configuration saved.',
                'config'  => $config,
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
