<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Core\Response;
use App\Core\Request;

class AuthController
{
    private UserModel $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function login()
    {
        $data = Request::all();
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            return Response::json(['success' => false, 'error' => 'Username and password required'], 400);
        }

        $user = $this->userModel->findByUsername($username);

        if (!$user || !password_verify($password, $user['password'])) {
            return Response::json(['success' => false, 'error' => 'Invalid username or password'], 401);
        }

        // Standard PHP Session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];

        return Response::json([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ]
        ]);
    }

    public function logout()
    {
        session_destroy();
        return Response::json(['success' => true]);
    }

    public function me()
    {
        if (!isset($_SESSION['user_id'])) {
            return Response::json(['success' => false, 'error' => 'Not authenticated'], 401);
        }

        return Response::json([
            'success' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'role' => $_SESSION['role']
            ]
        ]);
    }
}
