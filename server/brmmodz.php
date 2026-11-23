<?php
declare(strict_types=1);
/**
 * BMRMODZ Data Tool Diagnostics - temporary public HTTPS report receiver.
 * Endpoint: https://dzooky.eu/brmmodz.php
 * Compatible with Data Tool Diagnostics v0.1.4 (no upload token).
 * Deploy only for a short diagnostic test, then disable or restrict it.
 * Requires PHP to execute .php files inside bmrmodz_reports/ as well.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function reply(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    reply(405, ['ok' => false, 'error' => 'Method not allowed']);
}
// Use the actual TLS connection, or HTTPS as vouched for by the local trusted
// reverse proxy configuration. Do not blindly trust X-Forwarded-Proto.
if (($_SERVER['HTTPS'] ?? '') !== 'on' && ($_SERVER['SERVER_PORT'] ?? '') !== '443') {
    reply(403, ['ok' => false, 'error' => 'HTTPS required']);
}
if (!isset($_SERVER['CONTENT_TYPE']) || !preg_match('~^application/json(?:\s*;|\s*$)~i', $_SERVER['CONTENT_TYPE'])) {
    reply(415, ['ok' => false, 'error' => 'JSON required']);
}
const MAX_BYTES = 32768;
if (isset($_SERVER['CONTENT_LENGTH']) && (int) $_SERVER['CONTENT_LENGTH'] > MAX_BYTES) {
    reply(413, ['ok' => false, 'error' => 'Report too large']);
}
$raw = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if ($raw === false || strlen($raw) > MAX_BYTES) {
    reply(413, ['ok' => false, 'error' => 'Report too large']);
}
$report = json_decode($raw, true);
if (!is_array($report) || ($report['schema'] ?? null) !== 1
    || ($report['application'] ?? null) !== 'bmrmodz-data-diagnostics'
    || !isset($report['results']) || !is_array($report['results'])
    || count($report['results']) > 32) {
    reply(422, ['ok' => false, 'error' => 'Invalid report']);
}
$allowed = ['schema','application','runMode','startedAt','finishedAt','totals',
    'results','controlsTested','signalPermissionsVerified','deviceVerified','notes'];
foreach ($report as $field => $_) {
    if (!in_array($field, $allowed, true)) reply(422, ['ok' => false, 'error' => 'Unknown report field']);
}
foreach ($report['results'] as $item) {
    if (!is_array($item)
        || !is_string($item['id'] ?? null)
        || !preg_match('/^[a-zA-Z0-9_-]{1,30}$/D', $item['id'])
        || !in_array($item['status'] ?? '', ['PASS','FAIL','SKIP'], true)
        || !is_string($item['detail'] ?? null) || strlen($item['detail']) > 160) {
        reply(422, ['ok' => false, 'error' => 'Invalid result']);
    }
}
// Prevent sensitive fields from being accidentally persisted in nested data.
if (preg_match('/"\s*(?:vin|gps|latitude|longitude|vehicleOrder|rawUds|credentials|token)\s*"\s*:/i', $raw)) {
    reply(422, ['ok' => false, 'error' => 'Sensitive field present']);
}
$directory = __DIR__ . DIRECTORY_SEPARATOR . 'bmrmodz_reports';
if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
    reply(503, ['ok' => false, 'error' => 'Storage unavailable']);
}
if (!is_writable($directory)) reply(503, ['ok' => false, 'error' => 'Storage unavailable']);
// This is a temporary PUBLIC, unauthenticated endpoint. Bound its write volume.
// The lock also protects against concurrent writers surpassing the cap.
$lock = fopen($directory . DIRECTORY_SEPARATOR . '.upload-lock.php', 'c+');
if ($lock === false || !flock($lock, LOCK_EX)) reply(503, ['ok' => false, 'error' => 'Storage locked']);
$hour = gmdate('YmdH');
$counterFile = $directory . DIRECTORY_SEPARATOR . '.hourly-count.php';
$counterRaw = is_file($counterFile) ? file_get_contents($counterFile) : '';
$counter = is_string($counterRaw) ? json_decode(substr($counterRaw, strpos($counterRaw, "\n") + 1), true) : null;
$used = is_array($counter) && ($counter['hour'] ?? '') === $hour ? (int) ($counter['count'] ?? 0) : 0;
if ($used >= 30 || count(glob($directory . DIRECTORY_SEPARATOR . '*.php') ?: []) >= 501) {
    flock($lock, LOCK_UN);
    fclose($lock);
    reply(429, ['ok' => false, 'error' => 'Upload quota reached']);
}
$id = bin2hex(random_bytes(12));
$filepath = $directory . DIRECTORY_SEPARATOR . $id . '.php';
$json = json_encode($report, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false) {
    flock($lock, LOCK_UN); fclose($lock);
    reply(422, ['ok' => false, 'error' => 'Report encoding error']);
}
// Each file returns HTTP 404 when requested directly. The JSON starts on
// the second line for extraction by an administrator using filesystem access.
// IMPORTANT: PHP execution MUST be enabled for this folder; a static-file
// fallback would expose the report. Use a private folder for production.
$guard = "<?php http_response_code(404); exit; __halt_compiler(); ?>\n";
$created = fopen($filepath, 'x');
if ($created === false || fwrite($created, $guard . $json . "\n") === false) {
    if (is_resource($created)) fclose($created);
    @unlink($filepath);
    flock($lock, LOCK_UN); fclose($lock);
    reply(500, ['ok' => false, 'error' => 'Storage error']);
}
fclose($created);
@chmod($filepath, 0600);
file_put_contents($counterFile, "<?php http_response_code(404); exit; __halt_compiler(); ?>\n" . json_encode(['hour'=>$hour,'count'=>$used + 1]), LOCK_EX);
@chmod($counterFile, 0600);
flock($lock, LOCK_UN);
fclose($lock);
reply(201, ['ok' => true, 'id' => $id]);
