<?php
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
date_default_timezone_set('Asia/Kolkata');

require 'vendor/autoload.php';

use Kafka\Producer;
use Kafka\ProducerConfig;

$config = ProducerConfig::getInstance();
$config->setMetadataBrokerList('kafka:9092');

$producer = new Producer();

$csvFiles = glob(__DIR__ . '/csvfiles/*.csv');

// ── Type casting ──────────────────────────────────────────────
function autocast(string $value): mixed
{
    $value = trim($value);
    if ($value === '') return null;

    $cleanValue = str_replace(',', '', $value);
    if (ctype_digit($cleanValue))                                    return (int)$cleanValue;
    if (preg_match('/^-\d+$/', $cleanValue))                        return (int)$cleanValue;
    if (is_numeric($cleanValue) && str_contains($cleanValue, '.'))  return (float)$cleanValue;
    if (strtolower($value) === 'true')                              return true;
    if (strtolower($value) === 'false')                             return false;

    return $value;
}

// ── Detect and convert date strings to Solr ISO format ───────
// Handles: MM/DD/YYYY HH:MM, MM/DD/YYYY, YYYY-MM-DD, YYYY-MM-DD HH:MM:SS
function toSolrDate(string $value): string|null
{
    $value = trim($value);
    if ($value === '') return null;

    $formats = [
        'm/d/Y H:i'   => 'MM/DD/YYYY HH:MM',      // 03/10/2026 18:40
        'm/d/Y H:i:s' => 'MM/DD/YYYY HH:MM:SS',   // 03/10/2026 18:40:00
        'm/d/Y'        => 'MM/DD/YYYY',             // 03/10/2026
        'Y-m-d H:i:s' => 'YYYY-MM-DD HH:MM:SS',   // 2026-03-10 18:40:00
        'Y-m-d H:i'   => 'YYYY-MM-DD HH:MM',       // 2026-03-10 18:40
        'Y-m-d'        => 'YYYY-MM-DD',             // 2026-03-10
        'd/m/Y H:i'   => 'DD/MM/YYYY HH:MM',       // 10/03/2026 18:40
        'd/m/Y'        => 'DD/MM/YYYY',             // 10/03/2026
    ];

    foreach ($formats as $format => $_label) {
        $dt = DateTime::createFromFormat($format, $value);
        if ($dt && $dt->format($format) === $value) {
            // Return Solr-compatible ISO 8601 UTC format
            return $dt->format('Y-m-d\TH:i:s\Z');
        }
    }

    return null; // not a date
}

// ── Detect if a column contains dates ────────────────────────
// Samples first 5 non-empty values from the column
function isDateColumn(string $colName, array $sampleValues): bool
{
    // Column name hints
    $nameLower = strtolower($colName);
    $dateHints = ['date', 'time', 'created', 'updated', 'modified', 'at', 'on', 'datetime'];
    foreach ($dateHints as $hint) {
        if (str_contains($nameLower, $hint)) return true;
    }

    // Value pattern check — try to parse as date
    $dateCount = 0;
    foreach ($sampleValues as $v) {
        if (toSolrDate((string)$v) !== null) $dateCount++;
    }

    return $dateCount >= max(1, count($sampleValues) * 0.8); // 80% match = date column
}

// ── Process each CSV ──────────────────────────────────────────
$totalCount = 0;

foreach ($csvFiles as $csvFile) {

    $fileName = basename($csvFile);
    echo "📂 Processing $fileName\n";

    $handle = fopen($csvFile, 'r');
    $header = fgetcsv($handle);
    $header = array_map('trim', $header);

    // ── Sample first 10 rows to detect date columns ───────────
    $sampleRows  = [];
    $sampleCount = 0;
    while (($row = fgetcsv($handle)) !== false && $sampleCount < 10) {
        if (count($row) === count($header)) {
            $sampleRows[] = array_combine($header, $row);
            $sampleCount++;
        }
    }

    // Determine which columns are date columns
    $dateColumns = [];
    foreach ($header as $col) {
        $samples = array_filter(
            array_column($sampleRows, $col),
            fn($v) => $v !== '' && $v !== null
        );
        if (!empty($samples) && isDateColumn($col, array_values($samples))) {
            $dateColumns[$col] = true;
            echo "  📅 Detected date column: $col\n";
        }
    }

    // ── Rewind and process all rows ───────────────────────────
    rewind($handle);
    fgetcsv($handle); // skip header

    $count = 0;
    $kafkaBatch = [];

    while (($row = fgetcsv($handle)) !== false) {

        if (count($row) !== count($header)) continue;

        $raw  = array_combine($header, $row);
        $data = [];

        foreach ($raw as $key => $value) {

            $cleanKey = preg_replace('/[^a-zA-Z0-9_]/', '_', $key);
            $cleanKey = trim(preg_replace('/_+/', '_', $cleanKey), '_');

            $value = trim((string)$value);

            // ── Date column → convert to ISO + use _dt suffix ─
            if (isset($dateColumns[$key])) {
                $iso = toSolrDate($value);
                if ($iso !== null) {
                    $data[$cleanKey . '_dt'] = $iso;   // e.g. Date_dt = 2026-03-10T18:40:00Z
                } else {
                    $data[$cleanKey . '_s'] = $value;   // fallback to string
                }
                continue;
            }

            // ── Regular autocast ──────────────────────────────
            $cast = autocast($value);

            if ($cast === null) {
                $data[$cleanKey . '_s'] = '';
            } elseif (is_int($cast)) {
                $data[$cleanKey . '_i'] = $cast;
            } elseif (is_float($cast)) {
                $data[$cleanKey . '_f'] = $cast;
            } elseif (is_bool($cast)) {
                $data[$cleanKey . '_b'] = $cast;
            } else {
                $data[$cleanKey . '_s'] = $cast;
            }
        }

        $data['source_file_s'] = $fileName;

        $kafkaBatch[] = [
            'topic' => 'kafka-solr-csvdata',
            'value' => json_encode($data, JSON_UNESCAPED_UNICODE),
            'key'   => md5($fileName . ':' . $count . ':' . uniqid('', true)),
        ];

        $count++;
        $totalCount++;

        if (count($kafkaBatch) >= 50) {
            $attempts = 0;
            while ($attempts < 3) {
                try {
                    $producer->send($kafkaBatch);
                    break;
                } catch (\Exception $e) {
                    $attempts++;
                    echo "  ⚠️ Kafka send error: " . $e->getMessage() . " (Retry $attempts/3)\n";
                    sleep(2);
                    $producer = new Producer(); // Reconnect
                }
            }
            $kafkaBatch = [];
        }

        if ($count % 1000 === 0) {
            echo "  ⏳ Sent $count records from $fileName\n";
        }
    }

    if (!empty($kafkaBatch)) {
        $attempts = 0;
        while ($attempts < 3) {
            try {
                $producer->send($kafkaBatch);
                break;
            } catch (\Exception $e) {
                $attempts++;
                sleep(2);
                $producer = new Producer();
            }
        }
        $kafkaBatch = [];
    }

    fclose($handle);
    echo "✅ Finished $fileName — $count records\n";
}

echo "🎉 Total records sent to Kafka: $totalCount\n";