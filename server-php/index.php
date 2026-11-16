<?php
/**
 * REST API đồng bộ Offline-First & Quản lý tài khoản cho ứng dụng PLLĐ-BC (PHP 8+ & MySQL).
 *
 * Public:
 *   POST index.php?action=login            -> Đăng nhập, trả về Bearer token
 *
 * Authenticated (Bearer token hoặc X-Api-Key):
 *   GET  index.php?action=ping             -> Kiểm tra kết nối
 *   POST index.php?action=sync             -> Đồng bộ 2 chiều hồ sơ
 *
 * User Authenticated (Bearer token):
 *   GET  index.php?action=me               -> Thông tin tài khoản hiện tại
 *   POST index.php?action=change_password  -> Đổi mật khẩu
 *
 * Admin Only (Bearer token với role = admin):
 *   GET  index.php?action=users            -> Danh sách tài khoản
 *   POST index.php?action=create_user      -> Tạo tài khoản mới
 *   POST index.php?action=toggle_user      -> Khóa / mở khóa tài khoản
 *   POST index.php?action=reset_password   -> Đặt lại mật khẩu nhân viên
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

function getJsonBody(): array
{
    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody ?: '{}', true);
    if (!is_array($input)) {
        jsonResponse(['ok' => false, 'error' => 'Dữ liệu JSON gửi lên không hợp lệ.'], 400);
    }
    return $input;
}

function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string
{
    $padded = str_pad(strtr($data, '-_', '+/'), strlen($data) % 4 === 0 ? strlen($data) : strlen($data) + 4 - (strlen($data) % 4), '=', STR_PAD_RIGHT);
    return base64_decode($padded, true) ?: '';
}

function issueToken(array $user, string $secret, int $ttlSeconds = 2592000): string
{
    $payload = [
        'uid' => (int) $user['id'],
        'username' => (string) $user['username'],
        'role' => (string) $user['role'],
        'exp' => time() + $ttlSeconds,
    ];
    $encoded = base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE));
    $sig = base64UrlEncode(hash_hmac('sha256', $encoded, $secret, true));
    return $encoded . '.' . $sig;
}

function verifyToken(string $token, string $secret): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }
    [$encoded, $sig] = $parts;
    $expected = base64UrlEncode(hash_hmac('sha256', $encoded, $secret, true));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $payload = json_decode(base64UrlDecode($encoded), true);
    if (!is_array($payload) || empty($payload['uid']) || empty($payload['exp']) || (int) $payload['exp'] < time()) {
        return null;
    }
    return $payload;
}

function ensureUsersTable(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `plld_users` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `username` VARCHAR(64) NOT NULL,
          `full_name` VARCHAR(128) NOT NULL DEFAULT \'\',
          `password_hash` VARCHAR(255) NOT NULL,
          `role` ENUM(\'admin\', \'staff\') NOT NULL DEFAULT \'staff\',
          `is_active` TINYINT(1) NOT NULL DEFAULT 1,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uniq_username` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $count = (int) $pdo->query('SELECT COUNT(*) FROM plld_users')->fetchColumn();
    if ($count === 0) {
        $stmt = $pdo->prepare('INSERT INTO plld_users (username, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)');
        $stmt->execute([
            'admin',
            'Quản trị viên',
            password_hash('BaoChau@2026', PASSWORD_DEFAULT),
            'admin',
        ]);
    }
}

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    jsonResponse(['ok' => false, 'error' => 'Chưa cấu hình file config.php trên server.'], 500);
}

$config = require $configPath;
$secret = (string) ($config['api_key'] ?? '');
if ($secret === '') {
    jsonResponse(['ok' => false, 'error' => 'Thiếu api_key trong config.php.'], 500);
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

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    ensureUsersTable($pdo);
    $input = getJsonBody();
    $username = strtolower(trim((string) ($input['username'] ?? '')));
    $password = (string) ($input['password'] ?? '');

    if ($username === '' || $password === '') {
        jsonResponse(['ok' => false, 'error' => 'Vui lòng nhập tên đăng nhập và mật khẩu.'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, username, full_name, password_hash, role, is_active FROM plld_users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        jsonResponse(['ok' => false, 'error' => 'Sai tên đăng nhập hoặc mật khẩu.'], 401);
    }
    if ((int) $user['is_active'] !== 1) {
        jsonResponse(['ok' => false, 'error' => 'Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên.'], 403);
    }

    $token = issueToken($user, $secret);
    jsonResponse([
        'ok' => true,
        'token' => $token,
        'user' => [
            'id' => (int) $user['id'],
            'username' => (string) $user['username'],
            'fullName' => (string) $user['full_name'],
            'role' => (string) $user['role'],
        ],
    ]);
}

// Xác thực request cho các endpoint còn lại (Bearer token hoặc X-Api-Key)
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
$bearerToken = '';
if (is_string($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
    $bearerToken = trim(substr($authHeader, 7));
}
$providedApiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

$authUser = null;
$hasApiKeyAuth = false;

if ($bearerToken !== '') {
    $payload = verifyToken($bearerToken, $secret);
    if ($payload !== null) {
        ensureUsersTable($pdo);
        $stmt = $pdo->prepare('SELECT id, username, full_name, role, is_active FROM plld_users WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $payload['uid']]);
        $row = $stmt->fetch();
        if ($row && (int) $row['is_active'] === 1) {
            $authUser = [
                'id' => (int) $row['id'],
                'username' => (string) $row['username'],
                'fullName' => (string) $row['full_name'],
                'role' => (string) $row['role'],
            ];
        }
    }
}

if ($authUser === null && $providedApiKey !== '' && hash_equals($secret, $providedApiKey)) {
    $hasApiKeyAuth = true;
}

if ($authUser === null && !$hasApiKeyAuth) {
    jsonResponse(['ok' => false, 'error' => 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'], 401);
}

$requireUser = static function () use ($authUser): array {
    if ($authUser === null) {
        jsonResponse(['ok' => false, 'error' => 'Chức năng này yêu cầu đăng nhập bằng tài khoản.'], 401);
    }
    return $authUser;
};

$requireAdmin = static function () use ($requireUser): array {
    $user = $requireUser();
    if ($user['role'] !== 'admin') {
        jsonResponse(['ok' => false, 'error' => 'Chỉ tài khoản quản trị viên (Admin) mới có quyền thực hiện.'], 403);
    }
    return $user;
};

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'me') {
    $user = $requireUser();
    jsonResponse(['ok' => true, 'user' => $user]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'change_password') {
    $user = $requireUser();
    $input = getJsonBody();
    $currentPassword = (string) ($input['currentPassword'] ?? '');
    $newPassword = (string) ($input['newPassword'] ?? '');

    if (strlen($newPassword) < 6) {
        jsonResponse(['ok' => false, 'error' => 'Mật khẩu mới phải có ít nhất 6 ký tự.'], 400);
    }

    $stmt = $pdo->prepare('SELECT password_hash FROM plld_users WHERE id = ? LIMIT 1');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($currentPassword, (string) $row['password_hash'])) {
        jsonResponse(['ok' => false, 'error' => 'Mật khẩu hiện tại không đúng.'], 400);
    }

    $upd = $pdo->prepare('UPDATE plld_users SET password_hash = ? WHERE id = ?');
    $upd->execute([password_hash($newPassword, PASSWORD_DEFAULT), $user['id']]);
    jsonResponse(['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'users') {
    $requireAdmin();
    $rows = $pdo->query('SELECT id, username, full_name, role, is_active, created_at FROM plld_users ORDER BY id ASC')->fetchAll();
    $users = array_map(static fn (array $r): array => [
        'id' => (int) $r['id'],
        'username' => (string) $r['username'],
        'fullName' => (string) $r['full_name'],
        'role' => (string) $r['role'],
        'isActive' => (int) $r['is_active'] === 1,
        'createdAt' => (string) $r['created_at'],
    ], $rows);
    jsonResponse(['ok' => true, 'users' => $users]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_user') {
    $requireAdmin();
    $input = getJsonBody();
    $username = strtolower(trim((string) ($input['username'] ?? '')));
    $fullName = trim((string) ($input['fullName'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $role = ($input['role'] ?? 'staff') === 'admin' ? 'admin' : 'staff';

    if (!preg_match('/^[a-z0-9_.-]{3,32}$/', $username)) {
        jsonResponse(['ok' => false, 'error' => 'Tên đăng nhập 3-32 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới.'], 400);
    }
    if (strlen($password) < 6) {
        jsonResponse(['ok' => false, 'error' => 'Mật khẩu phải có ít nhất 6 ký tự.'], 400);
    }

    $check = $pdo->prepare('SELECT id FROM plld_users WHERE username = ? LIMIT 1');
    $check->execute([$username]);
    if ($check->fetch()) {
        jsonResponse(['ok' => false, 'error' => 'Tên đăng nhập đã tồn tại.'], 409);
    }

    $stmt = $pdo->prepare('INSERT INTO plld_users (username, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)');
    $stmt->execute([$username, $fullName ?: $username, password_hash($password, PASSWORD_DEFAULT), $role]);

    jsonResponse([
        'ok' => true,
        'user' => [
            'id' => (int) $pdo->lastInsertId(),
            'username' => $username,
            'fullName' => $fullName ?: $username,
            'role' => $role,
            'isActive' => true,
        ],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'toggle_user') {
    $admin = $requireAdmin();
    $input = getJsonBody();
    $targetId = (int) ($input['userId'] ?? 0);
    if ($targetId <= 0 || $targetId === $admin['id']) {
        jsonResponse(['ok' => false, 'error' => 'Không thể tự khóa tài khoản đang đăng nhập.'], 400);
    }
    $stmt = $pdo->prepare('UPDATE plld_users SET is_active = 1 - is_active WHERE id = ?');
    $stmt->execute([$targetId]);
    jsonResponse(['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reset_password') {
    $requireAdmin();
    $input = getJsonBody();
    $targetId = (int) ($input['userId'] ?? 0);
    $newPassword = (string) ($input['newPassword'] ?? '');
    if ($targetId <= 0 || strlen($newPassword) < 6) {
        jsonResponse(['ok' => false, 'error' => 'Mật khẩu mới phải có ít nhất 6 ký tự.'], 400);
    }
    $stmt = $pdo->prepare('UPDATE plld_users SET password_hash = ? WHERE id = ?');
    $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), $targetId]);
    jsonResponse(['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'ping') {
    $count = (int) $pdo->query('SELECT COUNT(*) FROM plld_records WHERE deleted_at IS NULL')->fetchColumn();
    jsonResponse([
        'ok' => true,
        'serverTime' => nowMs(),
        'activeRecords' => $count,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'sync') {
    $input = getJsonBody();
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
