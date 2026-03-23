<?php

namespace App\Models;

/**
 * UserConfigModel
 * Manages user-specific/report-specific UI configurations (like column widths)
 * Stored in storage/user_config.json
 */
class UserConfigModel
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = \App\Core\Database::getInstance();
    }

    public function get(int $userId, string $reportId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM user_configs WHERE user_id = ? AND report_id = ?");
        $stmt->execute([$userId, $reportId]);
        $row = $stmt->fetch();
        if (!$row) return null;

        $row['column_config'] = json_decode($row['column_config'], true);
        return $row;
    }

    public function save(int $userId, string $reportId, array $config): array
    {
        $stmt = $this->db->prepare("
            INSERT INTO user_configs (user_id, report_id, column_config, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, report_id) DO UPDATE SET
                column_config = EXCLUDED.column_config,
                updated_at    = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$userId, $reportId, json_encode($config)]);

        return $this->get($userId, $reportId);
    }
}
