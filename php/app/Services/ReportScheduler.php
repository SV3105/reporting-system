<?php

namespace App\Services;

use App\Core\Database;
use App\Models\ReportModel;
use App\Models\ViewModel;

class ReportScheduler
{
    private \PDO $db;
    private ReportModel $reportModel;
    private ViewModel $viewModel;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->reportModel = new ReportModel();
        $this->viewModel = new ViewModel();
    }

    public function processScheduledReports(): void
    {
        error_log("Checking for scheduled reports at " . date('Y-m-d H:i:s'));

        // Find active reports that haven't been sent today and whose schedule_time has passed
        // We use a simple logic: if last_sent_at is null OR last_sent_at < today's date
        // AND current_time >= schedule_time
        $currentTime = date('H:i:s');
        $today = date('Y-m-d');

        $stmt = $this->db->prepare("
            SELECT sr.*, u.email as user_email, v.name as view_name, v.filters, v.columns
            FROM scheduled_reports sr
            JOIN users u ON sr.user_id = u.id
            JOIN views v ON sr.view_id = v.id
            WHERE sr.is_active = TRUE
              AND (sr.last_sent_at IS NULL OR sr.last_sent_at::date < ?)
              AND sr.schedule_time <= ?
        ");
        $stmt->execute([$today, $currentTime]);
        $reports = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($reports as $report) {
            $this->sendScheduledReport($report);
        }
    }

    private function sendScheduledReport(array $report): void
    {
        error_log("Sending report '{$report['view_name']}' to {$report['user_email']}");

        try {
            // Fetch data from Solr using ReportModel
            $filters = json_decode($report['filters'], true) ?: [];
            $columns = json_decode($report['columns'], true) ?: [];
            
            // Get data (limit to 100 for email for now)
            $result = $this->reportModel->search($filters, 1, 100);
            $data = $result['records'] ?? [];

            if (empty($data)) {
                error_log("No data for report {$report['id']}, skipping email.");
                return;
            }

            // Generate HTML table
            $filterSummary = $this->generateFilterSummary($filters);
            $html = "<h3>Report: " . htmlspecialchars($report['view_name']) . "</h3>";
            $html .= "<p><strong>Filters Applied:</strong> " . ($filterSummary ?: "None") . "</p>";
            $html .= $this->generateHtmlTable($data, $columns);

            // Send email
            if (EmailService::sendReport($report['user_email'], $report['view_name'], $html)) {
                // Update last_sent_at
                $updateStmt = $this->db->prepare("UPDATE scheduled_reports SET last_sent_at = NOW() WHERE id = ?");
                $updateStmt->execute([$report['id']]);
                error_log("Report {$report['id']} sent successfully.");
            }
        } catch (\Exception $e) {
            error_log("Failed to process scheduled report {$report['id']}: " . $e->getMessage());
        }
    }

    private function generateHtmlTable(array $data, array $columns): string
    {
        if (empty($columns)) {
            $columns = array_keys($data[0] ?? []);
        }

        $html = "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
        $html .= "<tr style='background-color: #f2f2f2;'>";
        foreach ($columns as $col) {
            $html .= "<th>" . htmlspecialchars($col) . "</th>";
        }
        $html .= "</tr>";

        foreach ($data as $row) {
            $html .= "<tr>";
            foreach ($columns as $col) {
                $val = $row[$col] ?? '';
                if (is_array($val)) $val = implode(', ', $val);
                $html .= "<td>" . htmlspecialchars((string)$val) . "</td>";
            }
            $html .= "</tr>";
        }
        $html .= "</table>";
        return $html;
    }

    private function generateFilterSummary(array $filters): string
    {
        $summary = [];

        // Handle Advanced Logic filters
        if (isset($filters['_logic']) && is_array($filters['_logic'])) {
            foreach ($filters['_logic'] as $row) {
                $col = $row['column'] ?? '';
                $val = $row['search'] ?? ($row['min'] ? $row['min'] . ' to ' . $row['max'] : '');
                if ($col && $val) {
                    $cleanCol = str_replace(['_s', '_i', '_f', '_b', '_dt'], '', $col);
                    $summary[] = "<strong>" . htmlspecialchars($cleanCol) . "</strong>: " . htmlspecialchars((string)$val);
                }
            }
        } else {
            // Handle Simple filters
            foreach ($filters as $key => $val) {
                if ($key === '_logic' || $val === '' || $val === null) continue;
                $cleanKey = str_replace(['_s', '_i', '_f', '_b', '_dt'], '', $key);
                if (is_array($val)) $val = implode(', ', $val);
                $summary[] = "<strong>" . htmlspecialchars($cleanKey) . "</strong>: " . htmlspecialchars((string)$val);
            }
        }

        return implode(' | ', $summary);
    }
}
