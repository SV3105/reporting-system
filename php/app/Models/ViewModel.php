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
    public function getAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM views ORDER BY created_at DESC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['filters'] = json_decode($row['filters'], true);
            $row['columns'] = json_decode($row['columns'], true);
            $row['widths']  = json_decode($row['widths'], true);
            $row['sorting'] = json_decode($row['sorting'], true);
        }
        return $rows;
    }

    // ── Get view by ID ────────────────────────────────────────────
    public function getById(string $id): ?array
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
    public function create(array $payload): array
    {
        $id = uniqid('view_', true);
        $stmt = $this->db->prepare("
            INSERT INTO views (id, name, filters, columns, widths, sorting, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $id,
            $payload['name'],
            json_encode($payload['filters'] ?? []),
            json_encode($payload['columns'] ?? []),
            json_encode($payload['widths']  ?? []),
            json_encode($payload['sorting'] ?? [])
        ]);

        return $this->getById($id);
    }

    // ── Update existing view ──────────────────────────────────────
    public function update(string $id, array $payload): ?array
    {
        $updates = [];
        $params  = [];

        if (isset($payload['name']))    { $updates[] = "name = ?";    $params[] = $payload['name']; }
        if (isset($payload['filters'])) { $updates[] = "filters = ?"; $params[] = json_encode($payload['filters']); }
        if (isset($payload['columns'])) { $updates[] = "columns = ?"; $params[] = json_encode($payload['columns']); }
        if (isset($payload['widths']))  { $updates[] = "widths = ?";  $params[] = json_encode($payload['widths']); }
        if (isset($payload['sorting'])) { $updates[] = "sorting = ?"; $params[] = json_encode($payload['sorting']); }

        if (empty($updates)) return $this->getById($id);

        $updates[] = "updated_at = CURRENT_TIMESTAMP";
        $params[]  = $id;

        $sql = "UPDATE views SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    // ── Delete view ───────────────────────────────────────────────
    public function delete(string $id): bool
    {
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
