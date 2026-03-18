<?php

namespace App\Models;

class ReportModel
{
    private string $solrUrl;

    public function __construct()
    {
        $this->solrUrl = rtrim(
            getenv('SOLR_URL') ?: 'http://localhost:8983/solr/csvcore',
            '/'
        );
    }

    // ── Core HTTP helper ──────────────────────────────────────────
    private function solrGet(string $endpoint, array $params = []): array
    {
        $parts = [];
        foreach ($params as $key => $value) {
            if (is_array($value)) {
                foreach ($value as $v) {
                    $parts[] = urlencode($key) . '=' . urlencode($v);
                }
            } else {
                $parts[] = urlencode($key) . '=' . urlencode($value);
            }
        }
        $url = $this->solrUrl . $endpoint . '?' . implode('&', $parts);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr) throw new \RuntimeException("Solr connection error: $curlErr");
        if ($httpCode !== 200) throw new \RuntimeException("Solr returned HTTP $httpCode");

        $decoded = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE)
            throw new \RuntimeException("Invalid JSON from Solr");

        return $decoded;
    }

    // ── Detect if field is a true Solr date field (_dt suffix) ────
    private function isDateField(string $field): bool
    {
        return str_ends_with($field, '_dt') || str_ends_with($field, '_date');
    }

    // ── Build date fq — ISO range for _dt, wildcard OR for _s ─────
    private function buildDateFq(string $field, string $startDate, string $endDate): string
    {
        if ($this->isDateField($field)) {
            // True Solr date field — fast range query
            $from = $startDate . 'T00:00:00Z';
            $to   = $endDate   . 'T23:59:59Z';
            return "{$field}:[{$from} TO {$to}]";
        }

        // String date field (MM/DD/YYYY) — wildcard OR per day
        $start   = new \DateTime($startDate);
        $end     = new \DateTime($endDate);
        $dayDiff = (int) $start->diff($end)->days;

        $dates = [];
        $cur   = clone $start;

        if ($dayDiff <= 366) {
            while ($cur <= $end) {
                $dates[] = $field . ':*' . $cur->format('m/d/Y') . '*';
                $cur->modify('+1 day');
            }
        } else {
            for ($y = (int)$start->format('Y'); $y <= (int)$end->format('Y'); $y++) {
                $dates[] = $field . ':*/' . $y . '*';
            }
        }

        return '(' . implode(' OR ', $dates) . ')';
    }

    // ── Build fq string from filters array ────────────────────────
    private function buildFilterQuery(array $filters): string
    {
        $parts = [];
        foreach ($filters as $field => $value) {
            if ($value === '' || $value === null) continue;
            if (is_array($value) && array_key_exists('min', $value)) {
                $parts[] = "{$field}:[{$value['min']} TO {$value['max']}]";
            } elseif (is_array($value)) {
                $escaped = array_map(fn($v) => '"' . addslashes($v) . '"', $value);
                $parts[] = "{$field}:(" . implode(' OR ', $escaped) . ")";
            } elseif (str_contains((string)$value, '*')) {
                // Support full wildcards passed from frontend in filter_* params
                // We must properly escape spaces so Solr doesn't break the query apart
                $subparts = explode('|', $value);
                $escapedSubparts = array_map(function($sub) {
                    // Escape spaces to make it a single token for wildcard evaluation
                    return str_replace(' ', '\ ', $sub);
                }, $subparts);
                
                if (count($escapedSubparts) > 1) {
                    $parts[] = "{$field}:(" . implode(' OR ', $escapedSubparts) . ")";
                } else {
                    $parts[] = "{$field}:{$escapedSubparts[0]}";
                }
            } else {
                $parts[] = "{$field}:\"" . addslashes($value) . "\"";
            }
        }
        return implode(' AND ', $parts);
    }

    // ── Parse Solr flat facet array ───────────────────────────────
    private function parseFacetField(array $pairs): array
    {
        $result = [];
        for ($i = 0; $i < count($pairs); $i += 2) {
            if ($pairs[$i + 1] > 0) $result[$pairs[$i]] = $pairs[$i + 1];
        }
        return $result;
    }

    // ── Count docs in a date range ────────────────────────────────
    private function countInRange(string $field, string $startDate, string $endDate, array $extraFq = []): int
    {
        $params = ['q' => '*:*', 'wt' => 'json', 'rows' => 0];

        $dateFq = $this->buildDateFq($field, $startDate, $endDate);

        // For _dt fields use fq (efficient), for _s fields use q
        if ($this->isDateField($field)) {
            $allFq = array_merge([$dateFq], $extraFq);
            $params['fq'] = $allFq;
        } else {
            $params['q']  = $dateFq;
            if (!empty($extraFq)) $params['fq'] = $extraFq;
        }

        $result = $this->solrGet('/select', $params);
        return (int)($result['response']['numFound'] ?? 0);
    }

    // ── Calculate previous period ─────────────────────────────────
    public function calculatePreviousPeriod(string $startDate, string $endDate, string $compareType = 'previous'): array
    {
        $start    = new \DateTime($startDate);
        $end      = new \DateTime($endDate);

        if ($compareType === 'year') {
            $prevStart = clone $start;
            $prevStart->modify('-1 year');
            $prevEnd   = clone $end;
            $prevEnd->modify('-1 year');
        } else {
            $interval = $start->diff($end);
            $prevEnd   = clone $start;
            $prevEnd->modify('-1 day');
            $prevStart = clone $prevEnd;
            $prevStart->sub($interval);
        }

        return [
            'start' => $prevStart->format('Y-m-d'),
            'end'   => $prevEnd->format('Y-m-d'),
        ];
    }

    // ── Date range comparison endpoint ────────────────────────────
    public function dateRangeQuery(
        string $dateField,
        string $startDate,
        string $endDate,
        bool   $compare     = false,
        string $compareType = 'previous',
        array  $extraFq     = []
    ): array {
        $currentCount = $this->countInRange($dateField, $startDate, $endDate, $extraFq);

        $result = [
            'date_field' => $dateField,
            'current'    => [
                'start' => $startDate,
                'end'   => $endDate,
                'count' => $currentCount,
            ],
        ];

        if ($compare) {
            $prev          = $this->calculatePreviousPeriod($startDate, $endDate, $compareType);
            $previousCount = $this->countInRange($dateField, $prev['start'], $prev['end'], $extraFq);
            $difference    = $currentCount - $previousCount;
            $percentage    = $previousCount > 0
                ? round(($difference / $previousCount) * 100, 2)
                : null;

            $result['previous']   = [
                'start' => $prev['start'],
                'end'   => $prev['end'],
                'count' => $previousCount,
            ];
            $result['comparison'] = [
                'difference' => $difference,
                'percentage' => $percentage,
                'trend'      => $difference > 0 ? 'up' : ($difference < 0 ? 'down' : 'flat'),
            ];
        }

        return $result;
    }

    // ── Main search ───────────────────────────────────────────────
    public function search(
        array  $filters      = [],
        int    $page         = 1,
        int    $limit        = 20,
        string $sort         = '',
        array  $fields       = [],
        string $searchField  = '',
        string $searchTerm   = '',
        array  $facetFields  = [],
        int    $facetLimit   = 50,
        string $dateField    = '',
        string $startDate    = '',
        string $endDate      = ''
    ): array {
        $limit  = $limit === 0 ? 0 : min($limit, 10000);
        $offset = max(0, ($page - 1) * $limit);

        // Base query
        $q = '*:*';
        if ($searchField !== '' && $searchTerm !== '') {
            $escaped = addslashes($searchTerm);
            $q = str_contains($searchTerm, ' ')
                ? "{$searchField}:\"{$escaped}\""
                : "{$searchField}:*{$escaped}*";
        }

        $params  = ['q' => $q, 'wt' => 'json', 'rows' => $limit, 'start' => $offset];
        $fqParts = [];

        // Regular filters → fq
        $fq = $this->buildFilterQuery($filters);
        if ($fq !== '') $fqParts[] = $fq;

        // Date filter
        if ($dateField !== '' && $startDate !== '' && $endDate !== '') {
            if ($this->isDateField($dateField)) {
                // ISO range → fq (fast)
                $fqParts[] = $this->buildDateFq($dateField, $startDate, $endDate);
            } else {
                // String date → q param (wildcard)
                $dateQ = $this->buildDateFq($dateField, $startDate, $endDate);
                if ($q === '*:*') {
                    $params['q'] = $dateQ;
                } else {
                    $params['q'] = "+({$q}) +({$dateQ})";
                }
            }
        }

        if (!empty($fqParts))  $params['fq']   = $fqParts;
        if ($sort !== '')      $params['sort']  = $sort;
        if (!empty($fields))   $params['fl']    = implode(',', $fields);

        if (!empty($facetFields)) {
            $params['facet']          = 'true';
            $params['facet.field']    = $facetFields;
            $params['facet.limit']    = $facetLimit;
            $params['facet.mincount'] = 1;
            $params['facet.sort']     = 'count';
        }

        $result = $this->solrGet('/select', $params);

        $facets = [];
        if (!empty($facetFields)) {
            $raw = $result['facet_counts']['facet_fields'] ?? [];
            foreach ($raw as $field => $pairs) {
                $facets[$field] = $this->parseFacetField($pairs);
            }
        }

        return [
            'total'   => $result['response']['numFound'] ?? 0,
            'page'    => $page,
            'limit'   => $limit,
            'offset'  => $offset,
            'records' => $result['response']['docs'] ?? [],
            'facets'  => $facets,
        ];
    }

    // ── Standalone facets ─────────────────────────────────────────
    public function getFacets(array $fields, int $limit = 50): array
    {
        if (empty($fields)) return [];
        $params = [
            'q' => '*:*', 'wt' => 'json', 'rows' => 0,
            'facet' => 'true', 'facet.field' => $fields,
            'facet.limit' => $limit, 'facet.mincount' => 1, 'facet.sort' => 'count',
        ];
        $result = $this->solrGet('/select', $params);
        $raw    = $result['facet_counts']['facet_fields'] ?? [];
        $facets = [];
        foreach ($raw as $field => $pairs) {
            $facets[$field] = $this->parseFacetField($pairs);
        }
        return $facets;
    }

    // ── Stats ─────────────────────────────────────────────────────
    public function getStats(string $field, array $fq = []): array
    {
        $params = ['q' => '*:*', 'wt' => 'json', 'rows' => 0,
                   'stats' => 'true', 'stats.field' => $field];
        if (!empty($fq)) $params['fq'] = $fq;
        $result = $this->solrGet('/select', $params);
        return $result['stats']['stats_fields'][$field] ?? [];
    }

    // ── Fields from actual docs ───────────────────────────────────
    public function getFields(): array
    {
        $result = $this->solrGet('/select', ['q' => '*:*', 'wt' => 'json', 'rows' => 1]);
        $docs   = $result['response']['docs'] ?? [];
        if (empty($docs)) return [];
        $excluded = ['_version_', '_root_', '_nest_path_', '_text_'];
        return array_values(array_filter(array_keys($docs[0]), fn($f) => !in_array($f, $excluded)));
    }

    // ── Ping ──────────────────────────────────────────────────────
    public function ping(): bool
    {
        try {
            $result = $this->solrGet('/admin/ping');
            return ($result['status'] ?? '') === 'OK';
        } catch (\Throwable) {
            return false;
        }
    }
}