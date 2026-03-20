<?php
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
