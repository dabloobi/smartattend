<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

date_default_timezone_set('Asia/Manila');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    $host = 'localhost';
    $http_host = $_SERVER['HTTP_HOST'] ?? '';

    if ($http_host === 'localhost' || $http_host === '127.0.0.1' || strpos($http_host, 'localhost:') === 0) {
        // Local Development (XAMPP)
        $db_name  = 'smartattend_db';
        $username = 'root';
        $password = '';
    }
}

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=" . $env_charset, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $conn->exec("SET time_zone = '" . $env_timezone . "'");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]);
    exit();
}
?>
