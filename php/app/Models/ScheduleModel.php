<?php

namespace App\Models;

use App\Core\Database;

class ScheduleModel
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function getSchedulesByUserId(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT view_id, schedule_time, is_active 
            FROM scheduled_reports 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function upsertSchedule(int $userId, string $viewId, string $time, bool $isActive = true): void
    {
        // Enforce basic time format (HH:MM:SS or HH:MM)
        if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $time)) {
            throw new \InvalidArgumentException("Invalid time format.");
        }

        $updateStmt = $this->db->prepare("
            UPDATE scheduled_reports 
            SET schedule_time = ?, is_active = ?
            WHERE user_id = ? AND view_id = ?
        ");
        $updateStmt->execute([$time, $isActive ? 1 : 0, $userId, $viewId]);

        if ($updateStmt->rowCount() === 0) {
            $insertStmt = $this->db->prepare("
                INSERT INTO scheduled_reports (user_id, view_id, schedule_time, is_active)
                VALUES (?, ?, ?, ?)
            ");
            $insertStmt->execute([$userId, $viewId, $time, $isActive ? 1 : 0]);
        }
    }

    public function getAllWithDetails(): array
    {
        $stmt = $this->db->query("
            SELECT sr.id, sr.view_id, sr.schedule_time, sr.is_active, 
                   v.name as view_name, u.username as recipient_name, u.email as recipient_email
            FROM scheduled_reports sr
            JOIN views v ON v.id = sr.view_id
            JOIN users u ON u.id = sr.user_id
            ORDER BY sr.created_at DESC
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function bulkUpsert(string $viewId, array $userIds, string $time): void
    {
        // Enforce basic time format
        if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $time)) {
            throw new \InvalidArgumentException("Invalid time format.");
        }

        $this->db->beginTransaction();
        try {
            // First, remove existing recipients for this specific view to avoid duplicates
            // Alternatively, we could sync. Here we'll just upsert and keep it clean.
            foreach ($userIds as $userId) {
                $this->upsertSchedule((int)$userId, $viewId, $time, true);
            }
            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function deleteById(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM scheduled_reports WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}
