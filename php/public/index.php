<?php
date_default_timezone_set('Asia/Kolkata');
// Configure session cookie for cross-origin (cross-port) requests.
// SameSite=Lax works for localhost:5173 → localhost:8000 without requiring HTTPS.
// SameSite=None would require Secure=true which doesn't work on HTTP.
session_set_cookie_params([
    'lifetime' => 86400,       // 24 hours
    'path'     => '/',
    'domain'   => '',
    'secure'   => false,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

/**
 * Front Controller
 * All HTTP requests enter here → routed to correct Controller@method
 */

define('BASE_PATH', dirname(__DIR__));

require BASE_PATH . '/vendor/autoload.php';
require BASE_PATH . '/app/Core/Router.php';
require BASE_PATH . '/app/Core/Request.php';
require BASE_PATH . '/app/Core/Response.php';
require BASE_PATH . '/app/Core/Database.php';
require BASE_PATH . '/app/Core/Schema.php';

// Initialize Database Schema (IF NOT EXISTS)
(new \App\Core\Schema())->init();

require BASE_PATH . '/routes/api.php';
