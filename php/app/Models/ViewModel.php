<?php

namespace App\Models;

/**
 * ViewModel
 * Stores saved views as JSON in /var/www/html/storage/views.json
 * Each view: { id, name, filters, columns, sorting, created_at, updated_at }
 */
class ViewModel
{
    private string $storagePath;

    public function __construct()
    {
        $this->storagePath = BASE_PATH . '/storage/views.json';
        $this->ensureStorageExists();
    }

    // ── Ensure storage file + folder exist ────────────────────────
    private function ensureStorageExists(): void
    {
        $dir = dirname($this->storagePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        if (!file_exists($this->storagePath)) {
            file_put_contents($this->storagePath, json_encode([], JSON_PRETTY_PRINT));
        }
    }

    // ── Read all views from file ──────────────────────────────────
    private function readAll(): array
    {
        $content = file_get_contents($this->storagePath);
        if ($content === false) {
            throw new \RuntimeException('Could not read views storage file.');
        }
        $data = json_decode($content, true);
        return is_array($data) ? $data : [];
    }

    // ── Write all views to file (with file lock) ──────────────────
    private function writeAll(array $views): void
    {
        $fp = fopen($this->storagePath, 'c+');
        if (!$fp) {
            throw new \RuntimeException('Could not open views storage file for writing.');
        }

        // Exclusive lock — prevents concurrent writes
        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            throw new \RuntimeException('Could not acquire file lock.');
        }

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode(array_values($views), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
    }

    // ── Get all views ─────────────────────────────────────────────
    public function getAll(): array
    {
        return $this->readAll();
    }

    // ── Get view by ID ────────────────────────────────────────────
    public function getById(string $id): ?array
    {
        $views = $this->readAll();
        foreach ($views as $view) {
            if ($view['id'] === $id) return $view;
        }
        return null;
    }

    // ── Create new view ───────────────────────────────────────────
    public function create(array $payload): array
    {
        $views = $this->readAll();

        $view = [
            'id'         => uniqid('view_', true),
            'name'       => $payload['name'],
            'filters'    => $payload['filters']    ?? [],
            'columns'    => $payload['columns']    ?? [],
            'widths'     => $payload['widths']     ?? (object)[],
            'sorting'    => $payload['sorting']    ?? [],
            'created_at' => date('Y-m-d\TH:i:s\Z'),
            'updated_at' => date('Y-m-d\TH:i:s\Z'),
        ];

        $views[] = $view;
        $this->writeAll($views);

        return $view;
    }

    // ── Update existing view ──────────────────────────────────────
    public function update(string $id, array $payload): ?array
    {
        $views  = $this->readAll();
        $found  = false;
        $updated = null;

        foreach ($views as &$view) {
            if ($view['id'] === $id) {
                if (isset($payload['name']))    $view['name']    = $payload['name'];
                if (isset($payload['filters'])) $view['filters'] = $payload['filters'];
                if (isset($payload['columns'])) $view['columns'] = $payload['columns'];
                if (isset($payload['widths']))  $view['widths']  = $payload['widths'];
                if (isset($payload['sorting'])) $view['sorting'] = $payload['sorting'];
                $view['updated_at'] = date('Y-m-d\TH:i:s\Z');
                $updated = $view;
                $found   = true;
                break;
            }
        }

        if (!$found) return null;

        $this->writeAll($views);
        return $updated;
    }

    // ── Delete view ───────────────────────────────────────────────
    public function delete(string $id): bool
    {
        $views    = $this->readAll();
        $filtered = array_filter($views, fn($v) => $v['id'] !== $id);

        if (count($filtered) === count($views)) return false; // not found

        $this->writeAll($filtered);
        return true;
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
        if (isset($payload['columns']) && !is_array($payload['columns'])) {
            $errors[] = '"columns" must be an array';
        }
        if (isset($payload['filters']) && !is_array($payload['filters'])) {
            $errors[] = '"filters" must be an object';
        }
        if (isset($payload['sorting']) && !is_array($payload['sorting'])) {
            $errors[] = '"sorting" must be an object';
        }
        return $errors;
    }
}
