<?php

namespace App\Controllers;

use App\Models\ScheduleModel;

class ScheduleController
{
    private ScheduleModel $model;

    public function __construct()
    {
        $this->model = new ScheduleModel();
    }

    public function index(): void
    {
        $userId = (int)($_SESSION['user_id'] ?? 0);
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Not authenticated']);
            return;
        }

        $schedules = $this->model->getSchedulesByUserId($userId);
        
        // Map to key-value pairs { view_id: schedule_time } for easy frontend usage
        $mapped = [];
        foreach ($schedules as $s) {
            if ($s['is_active']) {
                // Return HH:MM instead of HH:MM:SS for the frontend <input type="time">
                $mapped[$s['view_id']] = substr($s['schedule_time'], 0, 5);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'schedules' => $mapped]);
    }

    public function upsert(): void
    {
        $userId = (int)($_SESSION['user_id'] ?? 0);
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Not authenticated']);
            return;
        }

        $payload = file_get_contents('php://input');
        $data = json_decode($payload, true) ?: [];

        $viewId = $data['view_id'] ?? '';
        $time   = $data['time'] ?? '';

        if (!$viewId || !$time) {
            http_response_code(400);
            echo json_encode(['error' => 'view_id and time are required']);
            return;
        }

        try {
            // Append seconds for Postgres TIME type
            $dbTime = strlen($time) === 5 ? $time . ':00' : $time;
            $this->model->upsertSchedule($userId, $viewId, $dbTime);
            
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => 'Schedule updated successfully']);
        } catch (\Throwable $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function adminIndex(): void
    {
        if (($_SESSION['role'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Admin access required']);
            return;
        }

        $schedules = $this->model->getAllWithDetails();
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'schedules' => $schedules]);
    }

    public function adminUpsert(): void
    {
        if (($_SESSION['role'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Admin access required']);
            return;
        }

        $payload = file_get_contents('php://input');
        $data = json_decode($payload, true) ?: [];

        $viewId  = $data['view_id'] ?? '';
        $userIds = $data['user_ids'] ?? [];
        $time    = $data['time'] ?? '';

        if (!$viewId || empty($userIds) || !$time) {
            http_response_code(400);
            echo json_encode(['error' => 'view_id, user_ids (array), and time are required']);
            return;
        }

        try {
            $dbTime = strlen($time) === 5 ? $time . ':00' : $time;
            $this->model->bulkUpsert($viewId, $userIds, $dbTime);
            
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => 'Schedules updated successfully']);
        } catch (\Throwable $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function destroy(): void
    {
        if (($_SESSION['role'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Admin access required']);
            return;
        }

        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $parts = explode('/', trim($uri, '/'));
        $id = (int)end($parts);

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Schedule ID required']);
            return;
        }

        if ($this->model->deleteById($id)) {
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => 'Schedule removed']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Schedule not found']);
        }
    }
}

