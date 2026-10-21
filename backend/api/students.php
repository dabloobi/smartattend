<?php
// students.php - Student Database CRUD API with Server-Side RBAC Enforcement

require_once 'config.php';
require_once 'mailer.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Require valid authentication token for viewing account/student details
        $auth = requireRole(['Student', 'Teacher', 'Admin']);
        $role = strtolower($auth['role'] ?? '');

        // Fetch single student/account
        if (isset($_GET['student_id'])) {
            $requestedId = trim($_GET['student_id']);

            // Role Level Security: Students can ONLY view their own profile
            if ($role === 'student') {
                if ($auth['student_id'] !== $requestedId && $auth['username'] !== $requestedId) {
                    http_response_code(403);
                    echo json_encode(["status" => "error", "message" => "Access denied. You can only view your own profile."]);
                    exit();
                }
            }

            $stmt = $conn->prepare("
                SELECT 
                    u.id AS user_id,
                    u.name,
                    u.username,
                    u.role,
                    u.student_id,
                    COALESCE(u.is_verified, 0) AS is_verified,
                    s.id AS id,
                    COALESCE(s.first_name, u.name) AS first_name,
                    COALESCE(s.last_name, '') AS last_name,
                    COALESCE(s.course, '-') AS course,
                    COALESCE(s.section, '-') AS section,
                    COALESCE(s.birth_date, 'N/A') AS birth_date,
                    COALESCE(NULLIF(u.email, ''), NULLIF(s.email, ''), '') AS email
                FROM users u
                LEFT JOIN students s ON u.student_id = s.student_id OR u.username = s.student_id
                WHERE s.student_id = ? OR u.student_id = ? OR u.username = ?
            ");
            $stmt->execute([$requestedId, $requestedId, $requestedId]);
            $student = $stmt->fetch();
            echo json_encode($student ? $student : ["message" => "Account not found"]);
        } else {
            // Viewing student list: Strictly Admin or Teacher only (Students cannot browse all student records)
            if ($role === 'student') {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden. Students cannot view the full student directory."]);
                exit();
            }

            $stmt = $conn->query("
                SELECT 
                    u.id AS user_id,
                    u.name,
                    u.username,
                    u.role,
                    u.student_id,
                    COALESCE(u.is_verified, 0) AS is_verified,
                    s.id AS student_table_id,
                    COALESCE(s.id, u.id) AS id,
                    COALESCE(s.first_name, u.name) AS first_name,
                    COALESCE(s.last_name, '') AS last_name,
                    COALESCE(s.course, '-') AS course,
                    COALESCE(s.section, '-') AS section,
                    COALESCE(s.birth_date, 'N/A') AS birth_date,
                    COALESCE(NULLIF(u.email, ''), NULLIF(s.email, ''), '') AS email
                FROM users u
                LEFT JOIN students s ON (u.student_id IS NOT NULL AND u.student_id != '' AND u.student_id = s.student_id) OR (u.username = s.student_id)
                ORDER BY u.created_at DESC
            ");
            $accounts = $stmt->fetchAll();
            echo json_encode($accounts);
        }
        break;

    case 'POST':
        // Add new student (Admin Only: Server-Side Permission)
        requireRole(['Admin']);

        $data = json_decode(file_get_contents("php://input"), true);
        if (!empty($data['student_id']) && !empty($data['first_name']) && !empty($data['last_name'])) {
            $student_id = trim($data['student_id']);
            $first_name = trim($data['first_name']);
            $last_name = trim($data['last_name']);
            $course = isset($data['course']) ? trim($data['course']) : 'BSIT';
            $section = isset($data['section']) ? trim($data['section']) : '3-1';
            $birth_date = isset($data['birth_date']) ? trim($data['birth_date']) : date('Y-m-d');
            $email = !empty($data['email']) ? trim($data['email']) : strtolower($first_name . '.' . $last_name . '@smartattend.website');
            $username = !empty($data['username']) ? trim($data['username']) : $student_id;
            $raw_password = !empty($data['password']) ? trim($data['password']) : 'student123';
            $password_hash = password_hash($raw_password, PASSWORD_DEFAULT);
            $full_name = $first_name . ' ' . $last_name;

            try {
                $conn->beginTransaction();

                // 1. Insert into students database table
                $stmt = $conn->prepare("INSERT INTO students (student_id, first_name, last_name, course, section, birth_date, email) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$student_id, $first_name, $last_name, $course, $section, $birth_date, $email]);

                // Generate 6-digit verification code & 15-minute expiration
                $verification_code = strval(random_int(100000, 999999));
                $verification_expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

                // 2. Insert into users database table (storing email on users too)
                $user_stmt = $conn->prepare("INSERT INTO users (name, username, password, role, student_id, email, is_verified, verification_code, verification_expires_at) VALUES (?, ?, ?, 'Student', ?, ?, 0, ?, ?)");
                $user_stmt->execute([$full_name, $username, $password_hash, $student_id, $email, $verification_code, $verification_expires_at]);

                $conn->commit();

                // Send welcome verification email via PHPMailer if valid email
                if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    sendVerificationEmail($email, $full_name, $verification_code);
                }

                echo json_encode(["status" => "success", "message" => "Student record and login account created successfully"]);
            } catch (Exception $e) {
                if ($conn->inTransaction()) {
                    $conn->rollBack();
                }
                error_log("Failed to add student: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to add student. ID or Username may already exist."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Student ID, First Name, and Last Name are required."]);
        }
        break;

    case 'PUT':
        // Update account record (Admin Only: Server-Side Permission)
        requireRole(['Admin']);

        $data = json_decode(file_get_contents("php://input"), true);
        $user_id = !empty($data['user_id']) ? intval($data['user_id']) : null;
        $id = !empty($data['id']) ? intval($data['id']) : null;
        $role = !empty($data['role']) ? trim($data['role']) : 'Student';
        $full_name = !empty($data['name']) 
            ? trim($data['name']) 
            : (trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')));
        $email = isset($data['email']) ? trim($data['email']) : '';
        $is_verified_val = isset($data['is_verified']) ? intval($data['is_verified']) : 0;
        $password_hash = !empty($data['password']) ? password_hash(trim($data['password']), PASSWORD_DEFAULT) : null;
        $username = !empty($data['username']) ? trim($data['username']) : ($data['student_id'] ?? '');

        try {
            $conn->beginTransaction();

            // 1. Update users table for ALL roles (name, email, is_verified, password)
            if ($user_id) {
                if ($password_hash) {
                    $stmtUser = $conn->prepare("UPDATE users SET name = ?, email = ?, is_verified = ?, password = ? WHERE id = ?");
                    $stmtUser->execute([$full_name, $email, $is_verified_val, $password_hash, $user_id]);
                } else {
                    $stmtUser = $conn->prepare("UPDATE users SET name = ?, email = ?, is_verified = ? WHERE id = ?");
                    $stmtUser->execute([$full_name, $email, $is_verified_val, $user_id]);
                }
            } else if ($username) {
                if ($password_hash) {
                    $stmtUser = $conn->prepare("UPDATE users SET name = ?, email = ?, is_verified = ?, password = ? WHERE username = ? OR student_id = ?");
                    $stmtUser->execute([$full_name, $email, $is_verified_val, $password_hash, $username, $username]);
                } else {
                    $stmtUser = $conn->prepare("UPDATE users SET name = ?, email = ?, is_verified = ? WHERE username = ? OR student_id = ?");
                    $stmtUser->execute([$full_name, $email, $is_verified_val, $username, $username]);
                }
            }

            // 2. Update or sync students table metadata
            if ($role === 'Teacher' || $role === 'Admin') {
                if ($username) {
                    $stmtCheck = $conn->prepare("SELECT id FROM students WHERE student_id = ?");
                    $stmtCheck->execute([$username]);
                    if ($stmtCheck->fetch()) {
                        $stmtSt = $conn->prepare("UPDATE students SET first_name = ?, email = ? WHERE student_id = ?");
                        $stmtSt->execute([$full_name, $email, $username]);
                    } else {
                        $stmtSt = $conn->prepare("INSERT INTO students (student_id, first_name, last_name, course, section, birth_date, email) VALUES (?, ?, 'Faculty', 'Teacher', 'Faculty', CURRENT_DATE(), ?)");
                        $stmtSt->execute([$username, $full_name, $email]);
                    }
                }
            } else {
                // Student record
                $student_id = trim($data['student_id'] ?? $username);
                $first_name = trim($data['first_name'] ?? '');
                $last_name = trim($data['last_name'] ?? '');
                $course = trim($data['course'] ?? 'BSIT');
                $section = trim($data['section'] ?? '3-1');
                $birth_date = trim($data['birth_date'] ?? date('Y-m-d'));

                if ($id) {
                    $stmt = $conn->prepare("UPDATE students SET student_id = ?, first_name = ?, last_name = ?, course = ?, section = ?, birth_date = ?, email = ? WHERE id = ?");
                    $stmt->execute([$student_id, $first_name, $last_name, $course, $section, $birth_date, $email, $id]);
                } else if ($student_id) {
                    $stmt = $conn->prepare("UPDATE students SET first_name = ?, last_name = ?, course = ?, section = ?, birth_date = ?, email = ? WHERE student_id = ?");
                    $stmt->execute([$first_name, $last_name, $course, $section, $birth_date, $email, $student_id]);
                }
            }

            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Account updated successfully"]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            error_log("Failed to update account: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to update account."]);
        }
        break;

    case 'DELETE':
        // Delete account (Admin Only: Server-Side Permission)
        requireRole(['Admin']);

        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
        $student_id = isset($_GET['student_id']) ? trim($_GET['student_id']) : null;
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;

        try {
            $conn->beginTransaction();

            if ($user_id) {
                // Delete from users table by user_id
                $stmtGet = $conn->prepare("SELECT student_id, username FROM users WHERE id = ?");
                $stmtGet->execute([$user_id]);
                $u = $stmtGet->fetch();
                if ($u) {
                    $sid = $u['student_id'] ?: $u['username'];
                    $conn->prepare("DELETE FROM students WHERE student_id = ?")->execute([$sid]);
                }
                $conn->prepare("DELETE FROM users WHERE id = ?")->execute([$user_id]);
            } else if ($id) {
                // Delete by student table ID
                $stmtGet = $conn->prepare("SELECT student_id FROM students WHERE id = ?");
                $stmtGet->execute([$id]);
                $s = $stmtGet->fetch();
                if ($s) {
                    $conn->prepare("DELETE FROM users WHERE student_id = ? OR username = ?")->execute([$s['student_id'], $s['student_id']]);
                }
                $conn->prepare("DELETE FROM students WHERE id = ?")->execute([$id]);
            }

            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Account deleted successfully"]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            error_log("Failed to delete account: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to delete account."]);
        }
        break;
}
?>
