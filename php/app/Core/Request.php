<?php

namespace App\Core;

class Request
{
    /** GET query params */
    public static function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    /** POST / JSON body params */
    public static function input(string $key, mixed $default = null): mixed
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        return $body[$key] ?? $_POST[$key] ?? $default;
    }

    /** All GET params */
    public static function all(): array
    {
        return $_GET;
    }

    public static function method(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }
}
