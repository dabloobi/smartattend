<?php
// test.php - Simple diagnostic script to find why 503 is occurring
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json; charset=UTF-8");

$info = [
    "status" => "ok",
    "php_version" => PHP_VERSION,
    "host" => $_SERVER['HTTP_HOST'] ?? 'unknown',
    "pdo_mysql_installed" => extension_loaded('pdo_mysql'),
];

$host = 'localhost';
$db_name  = 'cahslmsx52_smartattend_db';
$username = 'cahslmsx52_test';
$password = 'O{39o*332]6h)C*-';

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $info["db_status"] = "Connected successfully to MySQL!";
} catch (PDOException $e) {
    $info["db_status"] = "Connection Failed: " . $e->getMessage();
}

echo json_encode($info, JSON_PRETTY_PRINT);
?>
