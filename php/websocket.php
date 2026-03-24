<?php
// php/websocket.php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use App\Services\WebSocketServer;
use React\Socket\SocketServer;
use React\EventLoop\Loop;

$port = 8082;
$internalPort = 8081;

$loop = Loop::get();
$webSocketService = new WebSocketServer();

// 1. Regular WebSocket Server (for browsers)
$webSocket = new IoServer(
    new HttpServer(
        new WsServer($webSocketService)
    ),
    new SocketServer("0.0.0.0:{$port}", [], $loop),
    $loop
);

// 2. Internal TCP Server (for consumer.php to send simple JSON)
$internalSocket = new SocketServer("127.0.0.1:{$internalPort}", [], $loop);
$internalSocket->on('connection', function (\React\Socket\ConnectionInterface $connection) use ($webSocketService) {
    $connection->on('data', function ($data) use ($webSocketService, $connection) {
        $webSocketService->broadcast($data);
        $connection->close();
    });
});

echo "🚀 WebSocket Server running on port {$port}...\n";
echo "🔐 Internal broadcaster listening on port {$internalPort}...\n";

$loop->run();
