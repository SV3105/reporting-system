<?php

use App\Core\Router;

// ── Auth endpoints ──────────────────────────────────────────
Router::post('/api/login',  'AuthController@login');
Router::post('/api/logout', 'AuthController@logout');
Router::get ('/api/me',     'AuthController@me');

// ── Report endpoints ──────────────────────────────────────────
Router::get('/api/reports',           'ReportController@index');
Router::get('/api/reports/daterange', 'ReportController@daterange');
Router::get('/api/reports/facets',    'ReportController@facets');
Router::get('/api/reports/stats',     'ReportController@stats');
Router::get('/api/reports/fields',    'ReportController@fields');
Router::get('/api/reports/health',    'ReportController@health');
Router::get('/api/reports/export',    'ReportController@export');

// ── Saved Views endpoints ─────────────────────────────────────
Router::get   ('/api/views',      'ViewController@index');
Router::post  ('/api/views',      'ViewController@store');
Router::get   ('/api/views/{id}', 'ViewController@show');
Router::put   ('/api/views/{id}', 'ViewController@update');
Router::delete('/api/views/{id}', 'ViewController@destroy');

// ── Schedules endpoints ───────────────────────────────────────
Router::get ('/api/schedules', 'ScheduleController@index');
Router::post('/api/schedules', 'ScheduleController@upsert');

// ── Admin Endpoints ───────────────────────────────────────────
Router::get('/api/admin/views', 'ViewController@adminIndex');
Router::get ('/api/admin/schedules', 'ScheduleController@adminIndex');
Router::post('/api/admin/schedules/bulk', 'ScheduleController@adminUpsert');
Router::delete('/api/admin/schedules/{id}', 'ScheduleController@destroy');

// ── User Config endpoints ─────────────────────────────────────
Router::get ('/api/user-config',  'UserConfigController@show');
Router::post('/api/user-config',  'UserConfigController@store');

// ── User Management endpoints ───────────────────────────────────
Router::get   ('/api/users',        'UserController@index');
Router::post  ('/api/users',        'UserController@store');
Router::delete('/api/users/{id}',   'UserController@destroy');

// ── Admin: All Views with creator info ───────────────────────────
Router::get('/api/admin/views', 'ViewController@adminIndex');

// ── Dispatch ──────────────────────────────────────────────────
Router::dispatch();