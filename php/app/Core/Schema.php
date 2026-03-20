<?php

namespace App\Core;

class Schema
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function init(): void
    {
        // 1. Create Views Table
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS views (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                filters JSONB NOT NULL DEFAULT '{}',
                columns JSONB NOT NULL DEFAULT '[]',
                widths JSONB NOT NULL DEFAULT '{}',
                sorting JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // 2. Create User Configs Table
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS user_configs (
                user_id INTEGER NOT NULL,
                report_id TEXT NOT NULL,
                column_config JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, report_id)
            )
        ");

        // 3. Create Users Table
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Seed default admin user if not exists
        $adminPass = password_hash('admin123', PASSWORD_BCRYPT);
        $this->db->exec("
            INSERT INTO users (username, password, role)
            VALUES ('admin', '$adminPass', 'admin')
            ON CONFLICT (username) DO NOTHING
        ");

        $this->migrateFromJson();
    }

    private function migrateFromJson(): void
    {
        $storageDir = BASE_PATH . '/storage';

        // Migrate Views
        $viewsFile = $storageDir . '/views.json';
        if (file_exists($viewsFile)) {
            $views = json_decode(file_get_contents($viewsFile), true) ?: [];
            $stmt = $this->db->prepare("
                INSERT INTO views (id, name, filters, columns, widths, sorting, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
            ");
            foreach ($views as $v) {
                $stmt->execute([
                    $v['id'],
                    $v['name'],
                    json_encode($v['filters'] ?? []),
                    json_encode($v['columns'] ?? []),
                    json_encode($v['widths']  ?? []),
                    json_encode($v['sorting'] ?? []),
                    $v['created_at'] ?? date('Y-m-d H:i:s'),
                    $v['updated_at'] ?? date('Y-m-d H:i:s')
                ]);
            }
        }

        // Migrate User Configs
        $configFile = $storageDir . '/user_config.json';
        if (file_exists($configFile)) {
            $configs = json_decode(file_get_contents($configFile), true) ?: [];
            $stmt = $this->db->prepare("
                INSERT INTO user_configs (user_id, report_id, column_config, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (user_id, report_id) DO NOTHING
            ");
            foreach ($configs as $c) {
                $stmt->execute([
                    $c['user_id'] ?? 1,
                    $c['report_id'] ?? 'default',
                    json_encode($c['column_config'] ?? []),
                    $c['created_at'] ?? date('Y-m-d H:i:s'),
                    $c['updated_at'] ?? date('Y-m-d H:i:s')
                ]);
            }
        }
    }
}
