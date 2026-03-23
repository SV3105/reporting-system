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
                user_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                filters JSONB NOT NULL DEFAULT '{}',
                columns JSONB NOT NULL DEFAULT '[]',
                widths JSONB NOT NULL DEFAULT '{}',
                sorting JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Ensure user_id column exists for views (for existing installations)
        $this->db->exec("
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='views' AND column_name='user_id') THEN
                    ALTER TABLE views ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
                END IF;
            END $$;
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

        // 4. Create Scheduled Reports Table
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS scheduled_reports (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                view_id TEXT NOT NULL REFERENCES views(id) ON DELETE CASCADE,
                schedule_time TIME NOT NULL DEFAULT '09:00:00',
                last_sent_at TIMESTAMP WITH TIME ZONE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
                INSERT INTO views (id, user_id, name, filters, columns, widths, sorting, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
            ");
            foreach ($views as $v) {
                $stmt->execute([
                    $v['id'],
                    $v['user_id'] ?? 1,
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
