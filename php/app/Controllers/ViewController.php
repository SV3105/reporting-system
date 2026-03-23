<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\ViewModel;

/**
 * ViewController
 *
 * GET    /api/views          → list all saved views
 * POST   /api/views          → create a new view
 * GET    /api/views/{id}     → get a specific view
 * PUT    /api/views/{id}     → update a view
 * DELETE /api/views/{id}     → delete a view
 *
 * POST/PUT body (JSON):
 * {
 *   "name":    "My Price Report",
 *   "filters": { "column": "Price_f", "min": 100, "max": 500 },
 *   "columns": ["Product_Name_s", "Price_f", "Brand_Name_s"],
 *   "sorting": { "field": "Price_f", "dir": "desc" }
 * }
 */
class ViewController
{
    private ViewModel $model;

    public function __construct()
    {
        $this->model = new ViewModel();
    }

    // ── GET /api/views ────────────────────────────────────────────
    public function index(): void
    {
        try {
            $userId = (int)($_SESSION['user_id'] ?? 0);
            $role   = $_SESSION['role'] ?? 'user';

            if (!$userId) {
                Response::json(['success' => false, 'error' => 'Not authenticated'], 401);
                return;
            }

            $views = $this->model->getAll($userId, $role);
            Response::json([
                'success' => true,
                'total'   => count($views),
                'views'   => $views,
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── GET /api/admin/views ── Admin: all views with creator info ─
    public function adminIndex(): void
    {
        try {
            if (($_SESSION['role'] ?? '') !== 'admin') {
                Response::json(['success' => false, 'error' => 'Forbidden: Admin access required'], 403);
                return;
            }

            $views = $this->model->getAllWithUsers();
            Response::json([
                'success' => true,
                'total'   => count($views),
                'views'   => $views,
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── POST /api/views ───────────────────────────────────────────
    public function store(): void
    {
        try {
            $payload = $this->getJsonBody();

            $errors = $this->model->validate($payload);
            if (!empty($errors)) {
                Response::json(['success' => false, 'errors' => $errors], 422);
                return;
            }

            $userId = $_SESSION['user_id'] ?? 0;
            $view = $this->model->create($payload, $userId);

            Response::json([
                'success' => true,
                'message' => 'View saved successfully.',
                'view'    => $view,
            ], 201);

        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── GET /api/views/{id} ───────────────────────────────────────
    public function show(): void
    {
        try {
            $id     = $this->extractId();
            $userId = (int)($_SESSION['user_id'] ?? 0);
            $role   = $_SESSION['role'] ?? 'user';

            if (!$userId) {
                Response::json(['success' => false, 'error' => 'Not authenticated'], 401);
                return;
            }

            $view = $this->model->getByIdFiltered($id, $userId, $role);

            if (!$view) {
                Response::json(['success' => false, 'error' => "View '{$id}' not found."], 404);
                return;
            }

            Response::json(['success' => true, 'view' => $view]);

        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── PUT /api/views/{id} ───────────────────────────────────────
    public function update(): void
    {
        try {
            $id      = $this->extractId();
            $payload = $this->getJsonBody();

            $errors = $this->model->validate($payload);
            if (!empty($errors)) {
                Response::json(['success' => false, 'errors' => $errors], 422);
                return;
            }

            $userId = $_SESSION['user_id'] ?? 0;
            $role   = $_SESSION['role'] ?? 'user';

            $view = $this->model->update($id, $payload, $userId, $role);

            if (!$view) {
                Response::json(['success' => false, 'error' => "View '{$id}' not found."], 404);
                return;
            }

            Response::json([
                'success' => true,
                'message' => 'View updated successfully.',
                'view'    => $view,
            ]);

        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── DELETE /api/views/{id} ────────────────────────────────────
    public function destroy(): void
    {
        try {
            $id      = $this->extractId();
            $userId  = $_SESSION['user_id'] ?? 0;
            $role    = $_SESSION['role'] ?? 'user';

            $deleted = $this->model->delete($id, $userId, $role);

            if (!$deleted) {
                Response::json(['success' => false, 'error' => "View '{$id}' not found."], 404);
                return;
            }

            Response::json([
                'success' => true,
                'message' => "View '{$id}' deleted successfully.",
            ]);

        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────

    private function getJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON body: ' . json_last_error_msg());
        }

        return is_array($data) ? $data : [];
    }

    private function extractId(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $parts = explode('/', trim($uri, '/'));
        $id  = end($parts);

        if (empty($id) || $id === 'views') {
            throw new \InvalidArgumentException('Missing view ID in URL. Use /api/views/{id}');
        }

        return $id;
    }
}
