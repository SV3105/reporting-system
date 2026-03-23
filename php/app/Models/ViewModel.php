<?php

namespace App\Models;

/**
 * ViewModel
 * Stores saved views as JSON in /var/www/html/storage/views.json
 * Each view: { id, name, filters, columns, sorting, created_at, updated_at }
 */
class ViewModel
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = \App\Core\Database::getInstance();
    }

    // ── Get all views ─────────────────────────────────────────────
    public function getAll(int $userId, string $role): array
    {
        if ($role === 'admin') {
            $stmt = $this->db->query("SELECT * FROM views ORDER BY created_at DESC");
            $rows = $stmt->fetchAll();
        } else {
            $stmt = $this->db->prepare("SELECT * FROM views WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$userId]);
            $rows = $stmt->fetchAll();
        }

        foreach ($rows as &$row) {
            $row['filters'] = json_decode($row['filters'], true);
            $row['columns'] = json_decode($row['columns'], true);
            $row['widths']  = json_decode($row['widths'], true);
            $row['sorting'] = json_decode($row['sorting'], true);
        }
        return $rows;
    }

    // ── Get all views with creator username (admin only) ──────────
    public function getAllWithUsers(): array
    {
        $stmt = $this->db->query("
            SELECT v.id, v.name, v.user_id, v.created_at, v.updated_at,
                   u.username AS created_by,
                   v.filters, v.columns
            FROM views v
            LEFT JOIN users u ON u.id = v.user_id
            ORDER BY v.created_at DESC
        ");
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['filters'] = json_decode($row['filters'], true);
            $row['columns'] = json_decode($row['columns'], true);
        }
        return $rows;
    }

    // ── Get view by ID (Filtered by RBAC) ─────────────────────────
    public function getByIdFiltered(string $id, int $userId, string $role): ?array
    {
        $view = $this->getById($id);
        if (!$view) return null;

        // RBAC: Check ownership unless Admin
        if ($role !== 'admin' && (int)$view['user_id'] !== $userId) {
            return null; // Forbidden
        }

        return $view;
    }

    // ── Internal helper: Get view by ID ───────────────────────────
    private function getById(string $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM views WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;

        $row['filters'] = json_decode($row['filters'], true);
        $row['columns'] = json_decode($row['columns'], true);
        $row['widths']  = json_decode($row['widths'], true);
        $row['sorting'] = json_decode($row['sorting'], true);
        return $row;
    }

    // ── Create new view ───────────────────────────────────────────
    public function create(array $payload, int $userId): array
    {
        $id = uniqid('view_', true);
        $stmt = $this->db->prepare("
            INSERT INTO views (id, user_id, name, filters, columns, widths, sorting, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $id,
            $userId,
            $payload['name'],
            json_encode($payload['filters'] ?? []),
            json_encode($payload['columns'] ?? []),
            json_encode($payload['widths']  ?? []),
            json_encode($payload['sorting'] ?? [])
        ]);

        return $this->getById($id);
    }

    // ── Update existing view ──────────────────────────────────────
    public function update(string $id, array $payload, int $userId, string $role): ?array
    {
        $view = $this->getById($id);
        if (!$view) return null;

        // RBAC: Check ownership unless Admin
        if ($role !== 'admin' && (int)$view['user_id'] !== $userId) {
            throw new \Exception("Unauthorized: You do not own this view.");
        }

        $updates = [];
        $params  = [];

        if (isset($payload['name']))    { $updates[] = "name = ?";    $params[] = $payload['name']; }
        if (isset($payload['filters'])) { $updates[] = "filters = ?"; $params[] = json_encode($payload['filters']); }
        if (isset($payload['columns'])) { $updates[] = "columns = ?"; $params[] = json_encode($payload['columns']); }
        if (isset($payload['widths']))  { $updates[] = "widths = ?";  $params[] = json_encode($payload['widths']); }
        if (isset($payload['sorting'])) { $updates[] = "sorting = ?"; $params[] = json_encode($payload['sorting']); }

        if (empty($updates)) return $view;

        $updates[] = "updated_at = CURRENT_TIMESTAMP";
        $params[]  = $id;

        $sql = "UPDATE views SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    // ── Delete view ───────────────────────────────────────────────
    public function delete(string $id, int $userId, string $role): bool
    {
        $view = $this->getById($id);
        if (!$view) return false;

        // RBAC: Check ownership unless Admin
        if ($role !== 'admin' && (int)$view['user_id'] !== $userId) {
            throw new \Exception("Unauthorized: You do not own this view.");
        }

        $stmt = $this->db->prepare("DELETE FROM views WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    // ── Validate required fields ──────────────────────────────────
    public function validate(array $payload): array
    {
        $errors = [];
        if (empty($payload['name'])) {
            $errors[] = '"name" is required';
        }
        if (isset($payload['name']) && strlen($payload['name']) > 100) {
            $errors[] = '"name" must be 100 characters or less';
        }
        return $errors;
    }
}
