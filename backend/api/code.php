<?php
// code.php - Class Attendance QR Code Management API for SmartAttend

require_once 'config.php';

// Auto-create attendance_codes table if it does not exist
try {
    $conn->exec("CREATE TABLE IF NOT EXISTS attendance_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
        section VARCHAR(50) DEFAULT 'All',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NULL,
        is_active TINYINT(1) DEFAULT 1
    )");
    // Add expires_at column if missing in existing table
    $conn->exec("ALTER TABLE attendance_codes ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL");
} catch (PDOException $e) {}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $action = isset($data['action']) ? $data['action'] : 'generate';

        if ($action === 'generate' || $action === 'generate_qr') {
            // Deactivate all previous active QR codes
            $conn->exec("UPDATE attendance_codes SET is_active = 0 WHERE is_active = 1");

            // Calculate expiration time based on duration & unit
            $duration_value = isset($data['duration_value']) ? intval($data['duration_value']) : 0;
            $duration_unit = isset($data['duration_unit']) ? trim($data['duration_unit']) : 'never';
            
            $expires_at = null;
            if ($duration_value > 0) {
                if ($duration_unit === 'minutes') {
                    $expires_at = date('Y-m-d H:i:s', strtotime("+{$duration_value} minutes"));
                } else if ($duration_unit === 'hours') {
                    $expires_at = date('Y-m-d H:i:s', strtotime("+{$duration_value} hours"));
                } else if ($duration_unit === 'days') {
                    $expires_at = date('Y-m-d H:i:s', strtotime("+{$duration_value} days"));
                }
            }

            // Generate a master 6-digit session QR code token
            $numericCode = strval(rand(100000, 999999));
            $qrCodeToken = "SMARTATTEND-QR-" . $numericCode;

            $stmt = $conn->prepare("INSERT INTO attendance_codes (code, section, expires_at, is_active) VALUES (?, 'All', ?, 1)");
            if ($stmt->execute([$qrCodeToken, $expires_at])) {
                echo json_encode([
                    "status" => "success",
                    "code" => $qrCodeToken,
                    "numeric_code" => $numericCode,
                    "section" => "All",
                    "expires_at" => $expires_at,
                    "message" => "Master Class Attendance QR Code generated successfully!"
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to generate attendance QR code."]);
            }
        }
        break;

    case 'GET':
        // Automatically deactivate expired codes
        $nowStr = date('Y-m-d H:i:s');
        $stmtExpire = $conn->prepare("UPDATE attendance_codes SET is_active = 0 WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at <= ?");
        $stmtExpire->execute([$nowStr]);

        // Fetch current active master QR code
        $stmt = $conn->query("SELECT * FROM attendance_codes WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");
        $activeCode = $stmt->fetch();
        
        if ($activeCode && (empty($activeCode['expires_at']) || strtotime($activeCode['expires_at']) > time())) {
            echo json_encode([
                "status" => "success",
                "active" => true,
                "code" => $activeCode['code'],
                "created_at" => $activeCode['created_at'],
                "expires_at" => $activeCode['expires_at']
            ]);
        } else {
            echo json_encode([
                "status" => "success",
                "active" => false,
                "code" => null,
                "expires_at" => null
            ]);
        }
        break;
}
?>
