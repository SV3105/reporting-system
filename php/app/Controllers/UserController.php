<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Core\Response;
use App\Core\Request;

class UserController
{
    private UserModel $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    private function checkAdmin()
    {
        if (($_SESSION['role'] ?? '') !== 'admin') {
            Response::json(['success' => false, 'error' => 'Forbidden: Admin access required'], 403);
            exit;
        }
    }

    public function index()
    {
        $this->checkAdmin();
        $users = $this->userModel->getAll();
        return Response::json(['success' => true, 'users' => $users]);
    }

    public function store()
    {
        $this->checkAdmin();
        $data = Request::all();
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        $email    = !empty($data['email']) ? $data['email'] : null; // empty string → null to avoid UNIQUE conflict
        $role     = $data['role'] ?? 'user';

        if (empty($username) || empty($password)) {
            return Response::json(['success' => false, 'error' => 'Username and password required'], 400);
        }

        try {
            $id = $this->userModel->create($username, $password, $email, $role);
            return Response::json([
                'success' => true,
                'message' => 'User created successfully',
                'user' => ['id' => $id, 'username' => $username, 'role' => $role]
            ], 201);
        } catch (\Exception $e) {
            return Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy()
    {
        $this->checkAdmin();
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $parts = explode('/', trim($uri, '/'));
        $id = (int) end($parts);

        if (!$id) {
            return Response::json(['success' => false, 'error' => 'User ID required'], 400);
        }

        if ($id === (int)$_SESSION['user_id']) {
            return Response::json(['success' => false, 'error' => 'You cannot delete yourself'], 400);
        }

        $deleted = $this->userModel->delete($id);
        return Response::json(['success' => $deleted, 'message' => $deleted ? 'User deleted' : 'User not found']);
    }
}
