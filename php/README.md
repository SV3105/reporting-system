# PHP MVC API — Reporting System

## Folder Structure

```
php/
├── Dockerfile
├── .htaccess
├── composer.json
├── 000-default.conf          ← Apache vhost (mod_rewrite)
│
├── public/
│   └── index.php             ← Front Controller (entry point)
│
├── routes/
│   └── api.php               ← All route definitions
│
└── app/
    ├── Core/
    │   ├── Router.php        ← URI → Controller dispatcher
    │   ├── Request.php       ← Query/body param helpers
    │   └── Response.php      ← JSON response helpers
    │
    ├── Controllers/
    │   └── ReportController.php
    │
    ├── Models/
    │   └── ReportModel.php   ← All Solr query logic
    │
    └── Views/                ← Reserved (API returns JSON, no HTML views)
```

---

## Setup

```bash
# 1. Copy all files into your php/ folder
# 2. Run composer install (handled by Dockerfile)
docker-compose up -d --build php-api

# 3. Test health
curl http://localhost:8000/api/reports/health
```

---

## API Endpoints

### 1. Get Reports (paginated + filtered)
```
GET /api/reports
```
| Param | Type | Description |
|---|---|---|
| page | int | Page number (default: 1) |
| limit | int | Rows per page (default: 20, max: 500) |
| sort | string | e.g. `price_f desc` |
| fields | string | Comma-separated columns to return |
| filter_* | mixed | Any Solr field prefixed with `filter_` |

**Examples:**
```bash
# Basic fetch
curl "http://localhost:8000/api/reports"

# Paginated
curl "http://localhost:8000/api/reports?page=2&limit=50"

# Filter by category
curl "http://localhost:8000/api/reports?filter_category_s=chair"

# Price range + sort
curl "http://localhost:8000/api/reports?filter_price_f=100,500&sort=price_f+desc"

# Multi-value filter (pipe-separated)
curl "http://localhost:8000/api/reports?filter_category_s=chair|table"

# Specific columns only
curl "http://localhost:8000/api/reports?fields=id,name_s,price_f"
```

---

### 2. Get Facets (for dropdown filters)
```
GET /api/reports/facets?fields=category_s,brand_s
```
```json
{
  "success": true,
  "facets": {
    "category_s": [
      { "value": "chair", "count": 342 },
      { "value": "table", "count": 218 }
    ]
  }
}
```

---

### 3. Get Stats (numeric aggregations)
```
GET /api/reports/stats?field=price_f
```
```json
{
  "success": true,
  "field": "price_f",
  "stats": {
    "min": 9.99,
    "max": 4999.0,
    "sum": 1234567.0,
    "mean": 245.6,
    "count": 5023
  }
}
```

---

### 4. Date Range Comparison
```
GET /api/reports/compare
  ?date_field=created_at_dt
  &current_from=2024-01-01T00:00:00Z
  &current_to=2024-03-31T23:59:59Z
  &prev_from=2023-01-01T00:00:00Z
  &prev_to=2023-03-31T23:59:59Z
```
```json
{
  "success": true,
  "comparison": {
    "current":    { "count": 1523 },
    "previous":   { "count": 1204 },
    "difference": 319,
    "pct_change": 26.49
  }
}
```

---

### 5. Available Fields (for column selector)
```
GET /api/reports/fields
```

### 6. Health Check
```
GET /api/reports/health
```
