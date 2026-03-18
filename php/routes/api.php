<?php

use App\Core\Router;

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

// ── User Config endpoints ─────────────────────────────────────
Router::get ('/api/user-config',  'UserConfigController@show');
Router::post('/api/user-config',  'UserConfigController@store');

// ── Dispatch ──────────────────────────────────────────────────
Router::dispatch();