<?php

namespace App\Core;

class Router
{
    private static array $routes = [];

    public static function get(string $uri, string $action): void
    {
        self::$routes['GET'][$uri] = $action;
    }

    public static function post(string $uri, string $action): void
    {
        self::$routes['POST'][$uri] = $action;
    }

    public static function put(string $uri, string $action): void
    {
        self::$routes['PUT'][$uri] = $action;
    }

    public static function delete(string $uri, string $action): void
    {
        self::$routes['DELETE'][$uri] = $action;
    }

    public static function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $uri    = rtrim($uri, '/') ?: '/';

        // Handle CORS preflight
        if ($method === 'OPTIONS') {
            self::sendCorsHeaders();
            http_response_code(204);
            exit;
        }

        self::sendCorsHeaders();

        // ── Exact match ───────────────────────────────────────────
        $action = self::$routes[$method][$uri] ?? null;

        // ── Pattern match for /api/views/{id} ─────────────────────
        if (!$action) {
            foreach (self::$routes[$method] ?? [] as $pattern => $act) {
                // Convert {id} placeholder to regex
                $regex = '#^' . preg_replace('/\{[^}]+\}/', '[^/]+', $pattern) . '$#';
                if (preg_match($regex, $uri)) {
                    $action = $act;
                    break;
                }
            }
        }

        if (!$action) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => "Route not found: $method $uri"]);
            return;
        }

        [$controllerName, $methodName] = explode('@', $action);
        $controllerClass = "App\\Controllers\\$controllerName";

        if (!class_exists($controllerClass)) {
            http_response_code(500);
            echo json_encode(['error' => "Controller $controllerClass not found"]);
            return;
        }

        $controller = new $controllerClass();

        if (!method_exists($controller, $methodName)) {
            http_response_code(500);
            echo json_encode(['error' => "Method $methodName not found in $controllerClass"]);
            return;
        }

        $controller->$methodName();
    }

    private static function sendCorsHeaders(): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Content-Type: application/json');
    }
}