<?php

namespace App\Models;

/**
 * UserConfigModel
 * Manages user-specific/report-specific UI configurations (like column widths)
 * Stored in storage/user_config.json
 */
class UserConfigModel
{
    private string $storagePath;

    public function __construct()
    {
        $this->storagePath = BASE_PATH . '/storage/user_config.json';
        $this->ensureStorageExists();
    }

    private function ensureStorageExists(): void
    {
        $dir = dirname($this->storagePath);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        if (!file_exists($this->storagePath)) {
            file_put_contents($this->storagePath, json_encode([], JSON_PRETTY_PRINT));
        }
    }

    private function readAll(): array
    {
        $content = file_get_contents($this->storagePath);
        return json_decode($content, true) ?: [];
    }

    private function writeAll(array $configs): void
    {
        file_put_contents($this->storagePath, json_encode($configs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function get(int $userId, string $reportId): ?array
    {
        $configs = $this->readAll();
        foreach ($configs as $config) {
            if ($config['user_id'] === $userId && $config['report_id'] === $reportId) {
                return $config;
            }
        }
        return null;
    }

    public function save(array $payload): array
    {
        $configs = $this->readAll();
        $userId  = $payload['user_id'] ?? 1;
        $reportId = $payload['report_id'] ?? 'default';

        $found = false;
        foreach ($configs as &$c) {
            if ($c['user_id'] === $userId && $c['report_id'] === $reportId) {
                $c['column_config'] = $payload['column_config'] ?? (object)[];
                if (isset($c['column_config']['widths']) && empty($c['column_config']['widths'])) {
                    $c['column_config']['widths'] = (object)[];
                }
                $c['updated_at']    = date('Y-m-d\TH:i:s\Z');
                $found = true;
                $config = $c;
                break;
            }
        }

        if (!$found) {
            $columnConfig = $payload['column_config'] ?? (object)[];
            if (isset($columnConfig['widths']) && empty($columnConfig['widths'])) {
                $columnConfig['widths'] = (object)[];
            }
            $config = [
                'user_id'       => $userId,
                'report_id'     => $reportId,
                'column_config' => $columnConfig,
                'created_at'    => date('Y-m-d\TH:i:s\Z'),
                'updated_at'    => date('Y-m-d\TH:i:s\Z'),
            ];
            $configs[] = $config;
        }

        $this->writeAll($configs);
        return $config;
    }
}
