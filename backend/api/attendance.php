<?php
// attendance.php - Attendance logging and QR verification API for SmartAttend

require_once 'config.php';

// Auto-create tables if not exists
try {
    $conn->exec("CREATE TABLE IF NOT EXISTS attendance_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        course_section VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Present',
        method VARCHAR(50) DEFAULT 'QR Code Scan',
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $conn->exec("CREATE TABLE IF NOT EXISTS attendance_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
        section VARCHAR(50) DEFAULT 'All',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active TINYINT(1) DEFAULT 1
    )");
    // Migrate legacy 'Late' logs to 'Present'
    $conn->exec("UPDATE attendance_logs SET status = 'Present' WHERE status = 'Late'");
} catch (PDOException $e) {}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['student_id'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Student Account / ID is required."]);
            exit();
        }

        $submitted_code = !empty($data['attendance_code']) ? trim($data['attendance_code']) : (!empty($data['qr_code']) ? trim($data['qr_code']) : '');
        if (empty($submitted_code)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Teacher Attendance QR Code is required."]);
            exit();
        }

        $student_id = trim($data['student_id']);

        // 1. Verify Student Account / ID in database
        $stmt = $conn->prepare("SELECT * FROM students WHERE student_id = ?");
        $stmt->execute([$student_id]);
        $student = $stmt->fetch();

        if (!$student) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Account not registered in the system. Please register your account first."]);
            exit();
        }

        // 2. Verify Active QR Code
        $codeStmt = $conn->prepare("SELECT * FROM attendance_codes WHERE (code = ? OR code = ?) AND is_active = 1 ORDER BY created_at DESC LIMIT 1");
        $exactCode = $submitted_code;
        $prefixedCode = strpos($submitted_code, 'SMARTATTEND-QR-') === 0 ? $submitted_code : 'SMARTATTEND-QR-' . $submitted_code;
        $codeStmt->execute([$exactCode, $prefixedCode]);
        $activeCode = $codeStmt->fetch();

        if (!$activeCode) {
            // Check fallback for any active code
            $anyCodeStmt = $conn->query("SELECT * FROM attendance_codes WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");
            $activeCode = $anyCodeStmt->fetch();
            if (!$activeCode || ($activeCode['code'] !== $exactCode && $activeCode['code'] !== $prefixedCode && strpos($activeCode['code'], $submitted_code) === false)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Invalid or expired Class QR Code. Please scan the active QR code displayed by your teacher."]);
                exit();
            }
        }

        // 3. Check for Duplicate Daily Check-In
        $todayStr = date('Y-m-d');
        $checkDuplicate = $conn->prepare("SELECT * FROM attendance_logs WHERE student_id = ? AND DATE(check_in_time) = ?");
        $checkDuplicate->execute([$student_id, $todayStr]);
        $existingLog = $checkDuplicate->fetch();

        if ($existingLog) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "Attendance already recorded for today! (Checked in at " . date('h:i:s A', strtotime($existingLog['check_in_time'])) . ")",
                "student" => $student,
                "already_recorded" => true
            ]);
            exit();
        }

        $student_name = $student['first_name'] . ' ' . $student['last_name'];
        $course_section = $student['course'] . ' - ' . $student['section'];
        $status = 'Present';
        $check_method = !empty($data['method']) ? trim($data['method']) : 'QR Code Scan';

        // Insert attendance log
        $logStmt = $conn->prepare("INSERT INTO attendance_logs (student_id, student_name, course_section, status, method) VALUES (?, ?, ?, ?, ?)");
        if ($logStmt->execute([$student_id, $student_name, $course_section, $status, $check_method])) {
            echo json_encode([
                "status" => "success",
                "message" => "Attendance logged successfully! Status: Present",
                "student" => $student,
                "check_in_status" => "Present",
                "time" => date('h:i:s A')
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to log attendance."]);
        }
        break;

    case 'DELETE':
        $purge_date = isset($_GET['date']) ? trim($_GET['date']) : null;
        $purge_all = isset($_GET['purge_all']) ? true : false;

        try {
            if ($purge_all) {
                $conn->exec("DELETE FROM attendance_logs");
                echo json_encode(["status" => "success", "message" => "All attendance logs purged successfully!"]);
            } else if ($purge_date) {
                $stmt = $conn->prepare("DELETE FROM attendance_logs WHERE DATE(check_in_time) = ? OR check_in_time LIKE ?");
                $stmt->execute([$purge_date, $purge_date . '%']);
                echo json_encode(["status" => "success", "message" => "Attendance logs for date {$purge_date} purged successfully!"]);
            } else {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Purge date or purge_all parameter required."]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to purge attendance logs: " . $e->getMessage()]);
        }
        break;

    case 'GET':
        if (isset($_GET['student_id'])) {
            $stmt = $conn->prepare("SELECT * FROM attendance_logs WHERE student_id = ? ORDER BY check_in_time DESC");
            $stmt->execute([$_GET['student_id']]);
            $logs = $stmt->fetchAll();
            echo json_encode($logs);
        } else {
            $stmt = $conn->query("SELECT * FROM attendance_logs ORDER BY check_in_time DESC LIMIT 200");
            $logs = $stmt->fetchAll();
            echo json_encode($logs);
        }
        break;
}
?>
