<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\ReportModel;

/**
 * ReportController
 *
 * GET /api/reports
 *   Standard params: page, limit, sort, fields, column, min, max, search
 *   Facet params:    facet_field, facet_limit
 *   Date params:     date_field, start_date, end_date
 *
 * GET /api/reports/daterange
 *   Required: date_field, start_date, end_date
 *   Optional: compare=true → auto-calculates previous period
 *   Optional: filter_* → scope the count to a subset
 *
 * Sample response (/api/reports/daterange?compare=true):
 * {
 *   "current":    { "start": "...", "end": "...", "count": 1200 },
 *   "previous":   { "start": "...", "end": "...", "count": 1000 },
 *   "comparison": { "difference": 200, "percentage": 20, "trend": "up" }
 * }
 */
class ReportController
{
    private ReportModel $model;

    public function __construct() { $this->model = new ReportModel(); }

    // ── GET /api/reports ──────────────────────────────────────────
    public function index(): void
    {
        try {
            $page  = max(1, (int) Request::query('page', 1));
            $limit = (int) Request::query('limit', 20);
            $limit = $limit === 0 ? 0 : min(500, max(1, $limit));
            $sort  = Request::query('sort', '');
            $returnFields = array_filter(explode(',', Request::query('fields', '')));

            $column = trim(Request::query('column', ''));
            $min    = Request::query('min',    null);
            $max    = Request::query('max',    null);
            $search = trim(Request::query('search', ''));

            // Date range params (for filtering the main table)
            $dateField = trim(Request::query('date_field', ''));
            $startDate = trim(Request::query('start_date', ''));
            $endDate   = trim(Request::query('end_date',   ''));

            // Facet params
            $facetFields = [];
            $rawFacet    = $_GET['facet_field'] ?? null;
            if ($rawFacet !== null) {
                $facetFields = is_array($rawFacet) ? $rawFacet : [$rawFacet];
                $facetFields = array_values(array_filter(array_map('trim', $facetFields)));
            }
            $facetLimit = max(1, (int) Request::query('facet_limit', 50));

            // Build filters
            $filters     = [];
            $searchField = '';
            $searchTerm  = '';

            if ($column !== '') {
                if ($min !== null || $max !== null) {
                    $filters[$column] = [
                        'min' => $min !== null ? $min : '*',
                        'max' => $max !== null ? $max : '*',
                    ];
                }
                if ($search !== '') {
                    $searchField = $column;
                    $searchTerm  = $search;
                }
            }

            foreach (Request::all() as $key => $value) {
                if (!str_starts_with($key, 'filter_')) continue;
                $field = substr($key, 7);
                if (str_contains($value, ',') && !str_ends_with($field, '_s')) {
                    [$fMin, $fMax] = explode(',', $value, 2);
                    $filters[$field] = ['min' => trim($fMin), 'max' => trim($fMax)];
                } elseif (str_contains($value, '|')) {
                    $filters[$field] = explode('|', $value);
                } else {
                    $filters[$field] = $value;
                }
            }

            $data = $this->model->search(
                $filters, $page, $limit, $sort, $returnFields,
                $searchField, $searchTerm,
                $facetFields, $facetLimit,
                $dateField, $startDate, $endDate
            );

            $totalPages = ($limit > 0 && $data['limit'] > 0)
                ? (int) ceil($data['total'] / $data['limit'])
                : 0;

            Response::json([
                'success'         => true,
                'total'           => $data['total'],
                'page'            => $data['page'],
                'limit'           => $data['limit'],
                'total_pages'     => $totalPages,
                'filters_applied' => [
                    'column'     => $column     ?: null,
                    'min'        => $min,
                    'max'        => $max,
                    'search'     => $search     ?: null,
                    'date_field' => $dateField  ?: null,
                    'start_date' => $startDate  ?: null,
                    'end_date'   => $endDate    ?: null,
                ],
                'data'    => $data['records'],
                'records' => $data['records'],
                'facets'  => empty($data['facets']) ? new \stdClass() : $data['facets'],
            ]);

        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── GET /api/reports/daterange ────────────────────────────────
    // Dedicated endpoint for date range comparison
    //
    // Required params:
    //   date_field  string  Solr field to filter on e.g. "Date_s" or "created_dt"
    //   start_date  string  e.g. 2026-01-01
    //   end_date    string  e.g. 2026-03-31
    //
    // Optional params:
    //   compare     bool    If true, calculates previous period automatically
    //   filter_*    mixed   Additional filters to scope the count
    //
    // Example:
    //   /api/reports/daterange?date_field=Date_s&start_date=2026-01-01&end_date=2026-03-31&compare=true
    public function daterange(): void
    {
        try {
            $dateField   = trim(Request::query('date_field', ''));
            $startDate   = trim(Request::query('start_date', ''));
            $endDate     = trim(Request::query('end_date',   ''));
            $compare     = filter_var(Request::query('compare', 'false'), FILTER_VALIDATE_BOOLEAN);
            $compareType = trim(Request::query('compare_type', 'previous')); // 'previous' or 'year'

            // Validate required params
            $missing = [];
            if (!$dateField) $missing[] = 'date_field';
            if (!$startDate) $missing[] = 'start_date';
            if (!$endDate)   $missing[] = 'end_date';

            if (!empty($missing)) {
                Response::json([
                    'success' => false,
                    'error'   => 'Missing required params: ' . implode(', ', $missing),
                    'example' => '/api/reports/daterange?date_field=Date_s&start_date=2026-01-01&end_date=2026-03-31&compare=true',
                ], 400);
                return;
            }

            // Validate date format
            foreach (['start_date' => $startDate, 'end_date' => $endDate] as $param => $value) {
                if (!\DateTime::createFromFormat('Y-m-d', $value)) {
                    Response::json([
                        'success' => false,
                        'error'   => "Invalid date format for {$param}: '{$value}'. Use YYYY-MM-DD.",
                    ], 400);
                    return;
                }
            }

            // Extra fq filters (filter_* params)
            $extraFq = [];
            foreach (Request::all() as $key => $value) {
                if (!str_starts_with($key, 'filter_')) continue;
                $field    = substr($key, 7);
                $extraFq[] = "{$field}:\"" . addslashes($value) . "\"";
            }

            $result = $this->model->dateRangeQuery(
                $dateField, $startDate, $endDate, $compare, $compareType, $extraFq
            );

            Response::json(['success' => true, ...$result]);

        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── GET /api/reports/export ───────────────────────────────────
    public function export(): void
    {
        try {
            // Apply all the exact same filters as index()
            $sort  = Request::query('sort', '');
            $column = trim(Request::query('column', ''));
            $min    = Request::query('min',    null);
            $max    = Request::query('max',    null);
            $search = trim(Request::query('search', ''));
            $dateField = trim(Request::query('date_field', ''));
            $startDate = trim(Request::query('start_date', ''));
            $endDate   = trim(Request::query('end_date',   ''));

            $filters = [];
            $searchField = '';
            $searchTerm  = '';

            if ($column !== '') {
                if ($min !== null || $max !== null) {
                    $filters[$column] = ['min' => $min ?? '*', 'max' => $max ?? '*'];
                }
                if ($search !== '') {
                    $searchField = $column;
                    $searchTerm  = $search;
                }
            }

            foreach (Request::all() as $key => $value) {
                if (!str_starts_with($key, 'filter_')) continue;
                $field = substr($key, 7);
                if (str_contains((string)$value, ',') && !str_ends_with($field, '_s')) {
                    [$fMin, $fMax] = explode(',', $value, 2);
                    $filters[$field] = ['min' => trim($fMin), 'max' => trim($fMax)];
                } elseif (str_contains((string)$value, '|')) {
                    $filters[$field] = explode('|', $value);
                } else {
                    $filters[$field] = $value;
                }
            }

            // Fetch up to 10,000 records
            $data = $this->model->search(
                $filters, 1, 10000, $sort, [],
                $searchField, $searchTerm,
                [], 50,
                $dateField, $startDate, $endDate
            );

            $records = $data['records'] ?? [];

            // Stream CSV
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="report_export_' . date('Y-m-d') . '.csv"');
            
            $out = fopen('php://output', 'w');

            if (empty($records)) {
                fputcsv($out, ['No records found matching filters.']);
            } else {
                $headers = array_keys((array)$records[0]);
                // Exclude internal solr fields
                $headers = array_filter($headers, fn($h) => !in_array($h, ['_version_', '_root_', '_nest_path_']));
                fputcsv($out, $headers);

                foreach ($records as $row) {
                    $csvRow = [];
                    foreach ($headers as $h) {
                        $val = $row[$h] ?? '';
                        if (is_array($val)) $val = implode(', ', $val);
                        $csvRow[] = $val;
                    }
                    fputcsv($out, $csvRow);
                }
            }

            fclose($out);
            exit;

        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => 'Export failed: ' . $e->getMessage()], 500);
        }
    }

    // ── GET /api/reports/facets ───────────────────────────────────
    public function facets(): void
    {
        try {
            $fieldsParam = Request::query('fields', '');
            if (!$fieldsParam) {
                Response::json(['success' => false, 'error' => '"fields" param required. e.g. ?fields=Brand_Name_s,Type_s'], 400);
                return;
            }
            $facets = $this->model->getFacets(array_filter(explode(',', $fieldsParam)));
            Response::json(['success' => true, 'facets' => empty($facets) ? new \stdClass() : $facets]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ── GET /api/reports/stats ────────────────────────────────────
    public function stats(): void
    {
        try {
            $field = Request::query('field', '');
            if (!$field) { Response::json(['success' => false, 'error' => '"field" param required'], 400); return; }
            Response::json(['success' => true, 'field' => $field, 'stats' => $this->model->getStats($field)]);
        } catch (\Throwable $e) { Response::json(['success' => false, 'error' => $e->getMessage()], 500); }
    }

    // ── GET /api/reports/fields ───────────────────────────────────
    public function fields(): void
    {
        try { Response::json(['success' => true, 'fields' => $this->model->getFields()]); }
        catch (\Throwable $e) { Response::json(['success' => false, 'error' => $e->getMessage()], 500); }
    }

    // ── GET /api/reports/health ───────────────────────────────────
    public function health(): void
    {
        try {
            $ok = $this->model->ping();
            Response::json(['success' => $ok, 'solr' => $ok ? 'connected' : 'unreachable', 'solr_url' => getenv('SOLR_URL') ?: 'not set'], $ok ? 200 : 503);
        } catch (\Throwable $e) { Response::json(['success' => false, 'error' => $e->getMessage()], 503); }
    }
}