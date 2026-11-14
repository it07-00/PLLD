<?php
/**
 * REST API đồng bộ Offline-First cho ứng dụng PLLĐ-BC (chạy trên PHP 8+ & MySQL / Hosting iNET).
 *
 * Endpoints:
 *   GET  index.php?action=ping  -> Kiểm tra kết nối & API key
 *   POST index.php?action=sync  -> Đồng bộ 2 chiều hồ sơ & cài đặt
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function nowMs(): int
{
    return (int) floor(microtime(true) * 1000);
}

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    jsonResponse(['ok' => false, 'error' => 'Chưa cấu hình file config.php trên server.'], 500);
}

$config = require $configPath;

$providedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!$providedKey && isset($_SERVER['HTTP_AUTHORIZATION']) && str_starts_with($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ')) {
    $providedKey = substr($_SERVER['HTTP_AUTHORIZATION'], 7);
}

$expectedKey = (string) ($config['api_key'] ?? '');
if ($expectedKey === '' || $providedKey === '' || !hash_equals($expectedKey, $providedKey)) {
    jsonResponse(['ok' => false, 'error' => 'Sai hoặc thiếu mã bảo mật (API Key).'], 401);
}

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $config['db_charset'] ?? 'utf8mb4'
    );
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    jsonResponse(['ok' => false, 'error' => 'Không kết nối được cơ sở dữ liệu MySQL.'], 500);
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'ping') {
    $count = (int) $pdo->query('SELECT COUNT(*) FROM plld_records WHERE deleted_at IS NULL')->fetchColumn();
    jsonResponse([
        'ok' => true,
        'serverTime' => nowMs(),
        'activeRecords' => $count,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'sync') {
    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody ?: '{}', true);
    if (!is_array($input)) {
        jsonResponse(['ok' => false, 'error' => 'Dữ liệu JSON gửi lên không hợp lệ.'], 400);
    }

    $since = isset($input['since']) ? max(0, (int) $input['since']) : 0;
    $incomingRecords = is_array($input['records'] ?? null) ? $input['records'] : [];
    $serverNow = nowMs();
    $upserted = 0;

    $pdo->beginTransaction();
    try {
        $selectExisting = $pdo->prepare('SELECT updated_at FROM plld_records WHERE id = ? LIMIT 1');
        $upsertStmt = $pdo->prepare(
            'INSERT INTO plld_records (id, record_date, record_time, company_name, worker_name, payload, updated_at, deleted_at, device_id, server_updated_ms)
             VALUES (:id, :record_date, :record_time, :company_name, :worker_name, :payload, :updated_at, :deleted_at, :device_id, :server_updated_ms)
             ON DUPLICATE KEY UPDATE
               record_date = VALUES(record_date),
               record_time = VALUES(record_time),
               company_name = VALUES(company_name),
               worker_name = VALUES(worker_name),
               payload = VALUES(payload),
               updated_at = VALUES(updated_at),
               deleted_at = VALUES(deleted_at),
               device_id = VALUES(device_id),
               server_updated_ms = VALUES(server_updated_ms)'
        );

        foreach ($incomingRecords as $record) {
            if (!is_array($record) || empty($record['id']) || empty($record['date'])) {
                continue;
            }
            $id = (string) $record['id'];
            $incomingUpdatedAt = (string) ($record['updatedAt'] ?? $record['createdAt'] ?? '');
            if ($incomingUpdatedAt === '') {
                $incomingUpdatedAt = gmdate('Y-m-d\TH:i:s.000\Z');
            }

            $selectExisting->execute([$id]);
            $existing = $selectExisting->fetch();
            if ($existing && strcmp((string) $existing['updated_at'], $incomingUpdatedAt) >= 0) {
                continue;
            }

            $worker = is_array($record['worker'] ?? null) ? $record['worker'] : [];
            $upsertStmt->execute([
                ':id' => $id,
                ':record_date' => substr((string) $record['date'], 0, 10),
                ':record_time' => substr((string) ($record['time'] ?? ''), 0, 10),
                ':company_name' => mb_substr((string) ($worker['companyName'] ?? ''), 0, 255),
                ':worker_name' => mb_substr((string) ($worker['name'] ?? ''), 0, 255),
                ':payload' => json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':updated_at' => $incomingUpdatedAt,
                ':deleted_at' => !empty($record['deletedAt']) ? (string) $record['deletedAt'] : null,
                ':device_id' => mb_substr((string) ($record['deviceId'] ?? ''), 0, 128),
                ':server_updated_ms' => $serverNow,
            ]);
            $upserted++;
        }

        if ($since > 0) {
            $fetchStmt = $pdo->prepare('SELECT payload FROM plld_records WHERE server_updated_ms > ? ORDER BY server_updated_ms ASC');
            $fetchStmt->execute([$since]);
        } else {
            $fetchStmt = $pdo->query('SELECT payload FROM plld_records ORDER BY server_updated_ms ASC');
        }

        $serverRecords = [];
        while ($row = $fetchStmt->fetch()) {
            $decoded = json_decode($row['payload'], true);
            if (is_array($decoded)) {
                $serverRecords[] = $decoded;
            }
        }

        $pdo->commit();

        jsonResponse([
            'ok' => true,
            'serverTime' => $serverNow,
            'records' => $serverRecords,
            'stats' => [
                'received' => count($incomingRecords),
                'upserted' => $upserted,
                'sent' => count($serverRecords),
            ],
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonResponse(['ok' => false, 'error' => 'Lỗi đồng bộ dữ liệu trên server.'], 500);
    }
}

jsonResponse(['ok' => false, 'error' => 'Endpoint không hợp lệ.'], 404);
