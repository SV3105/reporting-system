<?php
// php/app/Services/WebSocketServer.php
namespace App\Services;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class WebSocketServer implements MessageComponentInterface
{
    protected $clients;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
        echo "✅ WebSocket Server Initialized\n";
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "🔗 New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        $this->broadcast($msg, $from);
    }

    public function broadcast(string $msg, $sender = null)
    {
        $data = json_decode($msg, true);
        
        if (isset($data['type']) && $data['type'] === 'broadcast') {
            $message = json_encode([
                'type' => $data['event'] ?? 'update',
                'payload' => $data['payload'] ?? null
            ]);

            foreach ($this->clients as $client) {
                if ($sender === null || $client !== $sender) {
                    $client->send($message);
                }
            }
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        echo "🔌 Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "❌ Error: {$e->getMessage()}\n";
        $conn->close();
    }
}
