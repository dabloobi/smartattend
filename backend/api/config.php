<?php
// config.php - Database connection, Security & CORS configuration for SmartAttend

// 1. Disable production debugging output to prevent leaking stack traces & server paths
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

// Set explicit default timezone to Asia/Manila (PST UTC+8)
date_default_timezone_set('Asia/Manila');

/**
 * Helper function to parse and load .env file into PHP environment
 */
function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if ((strpos($value, '"') === 0 && substr($value, -1) === '"') ||
                (strpos($value, "'") === 0 && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }
            putenv("{$name}={$value}");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
    return true;
}

// Attempt to load .env from backend root or api directory
loadEnv(__DIR__ . '/../.env') || loadEnv(__DIR__ . '/.env');

// 2. Tightened CORS Configuration
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1'
];

$env_allowed_origin = getenv('CORS_ALLOWED_ORIGIN') ?: ($_ENV['CORS_ALLOWED_ORIGIN'] ?? null);
if (!empty($env_allowed_origin)) {
    $origins_list = array_map('trim', explode(',', $env_allowed_origin));
    foreach ($origins_list as $o) {
        if (!empty($o) && !in_array($o, $allowed_origins)) {
            $allowed_origins[] = rtrim($o, '/');
        }
    }
}

if (!empty($origin) && in_array(rtrim($origin, '/'), $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
} else if (!empty($origin)) {
    // If origin sent is not in the whitelist, fall back to first configured origin
    header("Access-Control-Allow-Origin: " . $allowed_origins[0]);
} else {
    // Same-origin or non-browser request
    header("Access-Control-Allow-Origin: " . $allowed_origins[0]);
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Read database config from environment variables (with fallback defaults)
$env_host     = getenv('DB_HOST') !== false ? getenv('DB_HOST') : ($_ENV['DB_HOST'] ?? null);
$env_name     = getenv('DB_NAME') !== false ? getenv('DB_NAME') : ($_ENV['DB_NAME'] ?? null);
$env_user     = getenv('DB_USER') !== false ? getenv('DB_USER') : ($_ENV['DB_USER'] ?? null);
$env_pass     = getenv('DB_PASS') !== false ? getenv('DB_PASS') : ($_ENV['DB_PASS'] ?? null);
$env_charset  = getenv('DB_CHARSET') !== false ? getenv('DB_CHARSET') : ($_ENV['DB_CHARSET'] ?? 'utf8mb4');
$env_timezone = getenv('DB_TIMEZONE') !== false ? getenv('DB_TIMEZONE') : ($_ENV['DB_TIMEZONE'] ?? '+08:00');

if ($env_host !== null && $env_name !== null && $env_user !== null) {
    $host     = $env_host;
    $db_name  = $env_name;
    $username = $env_user;
    $password = $env_pass ?? '';
} else {
    // Fallback: Detect environment (Local XAMPP vs Live cPanel)
    $host = 'localhost';
    $http_host = $_SERVER['HTTP_HOST'] ?? '';

    if ($http_host === 'localhost' || $http_host === '127.0.0.1' || strpos($http_host, 'localhost:') === 0) {
        $db_name  = 'smartattend_db';
        $username = 'root';
        $password = '';
    } else {
        $db_name  = 'cahslmsx52_smartattend_db';
        $username = 'cahslmsx52_test';
        $password = 'O{39o*332]6h)C*-';
    }
}

// 3. Database Connection (Masking sensitive connection errors)
try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=" . $env_charset, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $conn->exec("SET time_zone = '" . $env_timezone . "'");

    // Auto-migrate profile & email verification columns in users table
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 0");
    } catch (PDOException $e) {}
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN verification_code VARCHAR(10) NULL");
    } catch (PDOException $e) {}
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN verification_expires_at DATETIME NULL");
    } catch (PDOException $e) {}
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN email VARCHAR(150) NULL");
    } catch (PDOException $e) {}
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL");
    } catch (PDOException $e) {}
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN pending_email VARCHAR(150) NULL");
    } catch (PDOException $e) {}
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failure. Please contact administrator or check server configuration."
    ]);
    exit();
}

// -------------------------------------------------------------
// 4. Server-Side Authentication & Role-Based Access Control (RBAC)
// -------------------------------------------------------------

function getAppSecret() {
    return getenv('APP_SECRET') ?: ($_ENV['APP_SECRET'] ?? 'smartattend_super_secure_jwt_token_secret_key_2026_99x');
}

/**
 * Generate a cryptographically signed HMAC auth token
 */
function generateAuthToken($user) {
    $payload = [
        'id'         => $user['id'] ?? null,
        'username'   => $user['username'] ?? '',
        'role'       => $user['role'] ?? 'Student',
        'student_id' => $user['student_id'] ?? null,
        'exp'        => time() + (86400 * 7) // 7 days expiration
    ];
    $encoded = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $encoded, getAppSecret());
    return $encoded . '.' . $sig;
}

/**
 * Validate signature and expiration of an auth token
 */
function verifyAuthToken($token) {
    if (empty($token) || !is_string($token)) {
        return null;
    }
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }
    list($encoded, $sig) = $parts;
    $expectedSig = hash_hmac('sha256', $encoded, getAppSecret());
    if (!hash_equals($expectedSig, $sig)) {
        return null; // Token signature tampered
    }
    $json = base64_decode(strtr($encoded, '-_', '+/'));
    $payload = json_decode($json, true);
    if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
        return null; // Expired or malformed
    }
    return $payload;
}

/**
 * Extract auth token from Authorization Header or X-Auth-Token
 */
function getBearerToken() {
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] 
        ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));

    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return trim($matches[1]);
    }
    if (!empty($headers['X-Auth-Token'] ?? $headers['x-auth-token'] ?? '')) {
        return trim($headers['X-Auth-Token'] ?? $headers['x-auth-token']);
    }
    if (!empty($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        return trim($_SERVER['HTTP_X_AUTH_TOKEN']);
    }
    return null;
}

/**
 * Retrieve current authenticated user (or null if unauthenticated)
 */
function getOptionalUser() {
    $token = getBearerToken();
    return verifyAuthToken($token);
}

/**
 * Force server-side permission check. Halts request with 401/403 if unauthorized.
 */
function requireRole($allowedRoles = ['Admin']) {
    $token = getBearerToken();
    $user = verifyAuthToken($token);

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            "status" => "error",
            "message" => "Unauthorized. Valid authentication token is required."
        ]);
        exit();
    }

    $rolesArray = array_map('strtolower', (array)$allowedRoles);
    $userRole = strtolower($user['role'] ?? '');

    if (!in_array($userRole, $rolesArray)) {
        http_response_code(403);
        echo json_encode([
            "status" => "error",
            "message" => "Forbidden. You do not have permission to perform this action."
        ]);
        exit();
    }

    return $user;
}
?>
