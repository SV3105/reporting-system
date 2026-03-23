<?php
date_default_timezone_set('Asia/Kolkata');

require 'vendor/autoload.php';

use Kafka\Consumer;
use Kafka\ConsumerConfig;

$config = ConsumerConfig::getInstance();
$config->setMetadataBrokerList('kafka:9092');
$config->setGroupId('solr-group');
$config->setTopics(['kafka-solr-csvdata']);
$config->setOffsetReset('earliest');

define('BATCH_SIZE', 1000);

// ── Solr type suffix from PHP value ──────────────────────────
function getSolrSuffix($value): string
{
    if (is_int($value))   return '_i';
    if (is_float($value)) return '_f';
    if (is_bool($value))  return '_b';
    return '_s';
}

// ── Check if key already has a valid Solr suffix ─────────────
// Preserves _dt, _i, _f, _b, _s set by the producer
function hasTypeSuffix(string $key): bool
{
    return preg_match('/_(dt|i|f|b|s)$/', $key) === 1;
}

// ── Send batch to Solr ────────────────────────────────────────
function sendBatchToSolr(array $batch): void
{
    if (empty($batch)) return;

    $solrUrl = "http://solr:8983/solr/csvcore/update/json/docs?commitWithin=5000";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL,           $solrUrl);
    curl_setopt($ch, CURLOPT_POST,          true);
    curl_setopt($ch, CURLOPT_POSTFIELDS,    json_encode($batch));
    curl_setopt($ch, CURLOPT_HTTPHEADER,    ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        echo "✅ Batch indexed: " . count($batch) . " docs\n";
    } else {
        echo "❌ Solr error ($httpCode): $response\n";
    }
}

// ── Main ──────────────────────────────────────────────────────
$batch        = [];
$totalIndexed = 0;
$consumer     = new Consumer();

$consumer->start(function ($topic, $part, $message) use (&$batch, &$totalIndexed) {

    $jsonData = $message['message']['value'];
    $data     = json_decode($jsonData, true);

    if (!$data) return;

    $doc = [];

    foreach ($data as $key => $value) {

        // Clean the key
        $cleanKey = preg_replace('/[^a-zA-Z0-9_]/', '_', $key);
        $cleanKey = preg_replace('/_+/', '_', $cleanKey);
        $cleanKey = trim($cleanKey, '_');

        $cleanValue = ($value === null) ? '' : $value;

        // ── Special fields ────────────────────────────────────
        if ($cleanKey === 'source_file' || $cleanKey === '_source_file') {
            $doc['source_file_s'] = $cleanValue;
            continue;
        }

        if ($cleanKey === 'id') {
            $doc['id'] = $cleanValue;
            continue;
        }

        // ── Preserve suffix already set by producer ───────────
        // If producer already added _dt, _i, _f, _b, _s → keep as-is
        if (hasTypeSuffix($cleanKey)) {
            $doc[$cleanKey] = $cleanValue;
            continue;
        }

        // ── Auto-assign suffix based on PHP type ──────────────
        $suffix        = getSolrSuffix($value);
        $doc[$cleanKey . $suffix] = $cleanValue;
    }

    // Generate unique document ID
    $doc['id'] = 'product_'
        . ($doc['product_id_i'] ?? '')
        . '_' . ($doc['source_file_s'] ?? '')
        . '_' . uniqid('', true);

    $batch[] = $doc;
    $totalIndexed++;

    if (count($batch) >= BATCH_SIZE) {
        sendBatchToSolr($batch);
        echo "📦 Total indexed so far: $totalIndexed\n";
        $batch = [];
    }
});

// Flush remaining batch
if (!empty($batch)) {
    sendBatchToSolr($batch);
    echo "📦 Final indexed count: $totalIndexed\n";
}

echo "🎉 All records indexed to Solr\n";