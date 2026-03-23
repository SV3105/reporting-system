<?php
date_default_timezone_set('Asia/Kolkata');

use App\Services\ReportScheduler;

require_once __DIR__ . '/vendor/autoload.php';

// Define BASE_PATH if not defined (needed by some core classes)
if (!defined('BASE_PATH')) {
    define('BASE_PATH', __DIR__);
}

// Simple Autoloader Bootstrap (if index.php doesn't do it globally)
// Our app uses composer for App\ namespace mostly.

try {
    $scheduler = new ReportScheduler();
    $scheduler->processScheduledReports();
} catch (\Exception $e) {
    error_log("Cron job exception: " . $e->getMessage());
}
