<?php
// students.php - Student Database CRUD API with Server-Side RBAC Enforcement

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Fetch accounts
        if (isset($_GET['student_id'])) {
            $requestedId = trim($_GET['student_id']);
            $auth = getOptionalUser();

            // Role Level Security: Students can only view their own profile
            if ($auth && strtolower($auth['role']) === 'student') {
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
                    s.id AS id,
                    s.first_name,
                    s.last_name,
                    s.course,
                    s.section,
                    s.birth_date,
                    s.email
                FROM users u
                LEFT JOIN students s ON u.student_id = s.student_id OR u.username = s.student_id
                WHERE s.student_id = ? OR u.student_id = ? OR u.username = ?
            ");
            $stmt->execute([$requestedId, $requestedId, $requestedId]);
            $student = $stmt->fetch();
            echo json_encode($student ? $student : ["message" => "Account not found"]);
        } else {
            // List all accounts (Protected: Admin or Teacher role recommended)
            $stmt = $conn->query("
                SELECT 
                    u.id AS user_id,
                    u.name,
                    u.username,
                    u.role,
                    u.student_id,
                    s.id AS student_table_id,
                    COALESCE(s.id, u.id) AS id,
                    COALESCE(s.first_name, u.name) AS first_name,
                    COALESCE(s.last_name, '') AS last_name,
                    COALESCE(s.course, '-') AS course,
                    COALESCE(s.section, '-') AS section,
                    COALESCE(s.birth_date, 'N/A') AS birth_date,
                    COALESCE(s.email, '') AS email
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
            $email = !empty($data['email']) ? trim($data['email']) : strtolower($first_name . '.' . $last_name . '@smartattend.edu');
            $username = !empty($data['username']) ? trim($data['username']) : $student_id;
            $raw_password = !empty($data['password']) ? trim($data['password']) : 'student123';
            $password_hash = password_hash($raw_password, PASSWORD_DEFAULT);
            $full_name = $first_name . ' ' . $last_name;

            try {
                $conn->beginTransaction();

                // 1. Insert into students database table
                $stmt = $conn->prepare("INSERT INTO students (student_id, first_name, last_name, course, section, birth_date, email) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$student_id, $first_name, $last_name, $course, $section, $birth_date, $email]);

                // 2. Insert into users database table
                $user_stmt = $conn->prepare("INSERT INTO users (name, username, password, role, student_id) VALUES (?, ?, ?, 'Student', ?)");
                $user_stmt->execute([$full_name, $username, $password_hash, $student_id]);

                $conn->commit();
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

        try {
            $conn->beginTransaction();

            $full_name = !empty($data['name']) 
                ? trim($data['name']) 
                : (trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')));
            $email = isset($data['email']) ? trim($data['email']) : '';

            $password_hash = !empty($data['password']) ? password_hash(trim($data['password']), PASSWORD_DEFAULT) : null;

            if ($role === 'Teacher' || $role === 'Admin') {
                // Update users table
                if ($user_id) {
                    if ($password_hash) {
                        $stmtUser = $conn->prepare("UPDATE users SET name = ?, password = ? WHERE id = ?");
                        $stmtUser->execute([$full_name, $password_hash, $user_id]);
                    } else {
                        $stmtUser = $conn->prepare("UPDATE users SET name = ? WHERE id = ?");
                        $stmtUser->execute([$full_name, $user_id]);
                    }
                }
                // Update or upsert student metadata for email display
                $username = !empty($data['username']) ? trim($data['username']) : ($data['student_id'] ?? '');
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
                // Update Student record
                $student_id = trim($data['student_id']);
                $first_name = trim($data['first_name']);
                $last_name = trim($data['last_name']);
                $course = trim($data['course']);
                $section = trim($data['section']);
                $birth_date = trim($data['birth_date']);

                if ($id) {
                    $stmt = $conn->prepare("UPDATE students SET student_id = ?, first_name = ?, last_name = ?, course = ?, section = ?, birth_date = ?, email = ? WHERE id = ?");
                    $stmt->execute([$student_id, $first_name, $last_name, $course, $section, $birth_date, $email, $id]);
                }
                // Sync users table
                if ($password_hash) {
                    $stmtUser = $conn->prepare("UPDATE users SET name = ?, password = ? WHERE student_id = ? OR username = ?");
                    $stmtUser->execute([$full_name, $password_hash, $student_id, $student_id]);
                } else {
                    $stmtUser = $conn->prepare("UPDATE users SET name = ? WHERE student_id = ? OR username = ?");
                    $stmtUser->execute([$full_name, $student_id, $student_id]);
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
