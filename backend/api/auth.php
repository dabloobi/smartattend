<?php
// auth.php - Authentication API (Sign In, Sign Up & Email Verification via PHPMailer) for SmartAttend

require_once 'config.php';
require_once 'mailer.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode(["status" => "online", "message" => "SmartAttend Auth API is working."]);
    exit();
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$action = isset($data['action']) ? $data['action'] : 'signin';

if ($action === 'signin') {
    // ------------------------------------------------------------------------
    // SIGN IN AUTHENTICATION
    // ------------------------------------------------------------------------
    if (empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username and password are required."]);
        exit();
    }

    $username = trim($data['username']);
    $password = trim($data['password']);

    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? OR student_id = ?");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();

    $isValid = false;
    if ($user) {
        if (password_verify($password, $user['password'])) {
            $isValid = true;
        } else if (password_needs_rehash($user['password'], PASSWORD_DEFAULT) || strlen($user['password']) < 60) {
            // Secure migration: If existing user had legacy seed hash or plaintext, verify once and upgrade to bcrypt
            if ($user['password'] === $password || 
                (($user['username'] === 'admin' || $user['username'] === 'teacher' || $user['username'] === 'juan2026') && ($password === 'admin123' || $password === 'student123'))) {
                $isValid = true;
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                $stmtRehash = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmtRehash->execute([$newHash, $user['id']]);
            }
        }
    }

    if ($user && $isValid) {
        unset($user['password']);

        // Fetch student / faculty details
        $studentDetails = null;
        $lookupId = !empty($user['student_id']) ? $user['student_id'] : $user['username'];
        if ($lookupId) {
            $stmtStudent = $conn->prepare("SELECT * FROM students WHERE student_id = ?");
            $stmtStudent->execute([$lookupId]);
            $studentDetails = $stmtStudent->fetch();
        }

        // Attach is_verified and email to user object for ALL users
        if (empty($user['email']) && !empty($studentDetails['email'])) {
            $user['email'] = $studentDetails['email'];
        }
        $user['is_verified'] = isset($user['is_verified']) ? (int)$user['is_verified'] : 0;

        // Generate HMAC signed authentication token
        $authToken = generateAuthToken($user);

        echo json_encode([
            "status" => "success",
            "message" => "Sign In successful!",
            "token" => $authToken,
            "user" => $user,
            "student" => $studentDetails
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid username or password."]);
    }

} else if ($action === 'signup') {
    // ------------------------------------------------------------------------
    // SIGN UP REGISTRATION (Student Self-Registration with PHPMailer OTP)
    // ------------------------------------------------------------------------
    if (empty($data['student_id']) || empty($data['first_name']) || empty($data['last_name']) || 
        empty($data['course']) || empty($data['section']) || empty($data['birth_date']) || 
        empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "All required fields must be filled out."]);
        exit();
    }

    $student_id = trim($data['student_id']);
    $first_name = trim($data['first_name']);
    $last_name = trim($data['last_name']);
    $course = trim($data['course']);
    $section = trim($data['section']);
    $birth_date = trim($data['birth_date']);
    $email = !empty($data['email']) ? trim($data['email']) : strtolower($first_name . '.' . $last_name . '@smartattend.website');
    $username = trim($data['username']);
    $password = password_hash(trim($data['password']), PASSWORD_DEFAULT);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Please provide a valid email address."]);
        exit();
    }

    // Generate 6-digit verification code & 15-minute expiration
    $verification_code = strval(random_int(100000, 999999));
    $verification_expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    try {
        $conn->beginTransaction();

        // 1. Insert into students table
        $stmtStudent = $conn->prepare("INSERT INTO students (student_id, first_name, last_name, course, section, birth_date, email) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmtStudent->execute([$student_id, $first_name, $last_name, $course, $section, $birth_date, $email]);

        // 2. Insert into users table with unverified status and OTP
        $fullName = $first_name . ' ' . $last_name;
        $stmtUser = $conn->prepare("INSERT INTO users (name, username, password, role, student_id, is_verified, verification_code, verification_expires_at) VALUES (?, ?, ?, 'Student', ?, 0, ?, ?)");
        $stmtUser->execute([$fullName, $username, $password, $student_id, $verification_code, $verification_expires_at]);

        $conn->commit();

        // 3. Send Verification Email via PHPMailer
        $mailResult = sendVerificationEmail($email, $fullName, $verification_code);

        echo json_encode([
            "status" => "success",
            "requires_verification" => true,
            "username" => $username,
            "email" => $email,
            "message" => "Registration successful! A 6-digit verification code has been sent to your email (" . htmlspecialchars($email) . ")."
        ]);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log("Registration Error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "Registration failed. Student ID or Username might already exist."
        ]);
    }

} else if ($action === 'verify_email') {
    // ------------------------------------------------------------------------
    // VERIFY EMAIL ADDRESS (Verify 6-Digit OTP Code)
    // ------------------------------------------------------------------------
    $identifier = trim($data['username'] ?? ($data['email'] ?? ($data['student_id'] ?? '')));
    $code = trim($data['code'] ?? ($data['verification_code'] ?? ''));

    if (empty($identifier) || empty($code)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username/Email and verification code are required."]);
        exit();
    }

    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? OR student_id = ? OR email = ?");
    $stmt->execute([$identifier, $identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user) {
        // Try searching student email or student_id if passed email
        $stmtSt = $conn->prepare("SELECT student_id, email FROM students WHERE email = ? OR student_id = ? LIMIT 1");
        $stmtSt->execute([$identifier, $identifier]);
        $st = $stmtSt->fetch();
        if ($st) {
            $stmt = $conn->prepare("SELECT * FROM users WHERE student_id = ? OR username = ? OR email = ?");
            $stmt->execute([$st['student_id'], $st['student_id'], $st['email']]);
            $user = $stmt->fetch();
        }
    }

    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User account not found."]);
        exit();
    }

    if ((int)($user['is_verified'] ?? 0) === 1) {
        echo json_encode([
            "status" => "success",
            "message" => "Account is already verified! You can proceed to sign in."
        ]);
        exit();
    }

    // Check code match
    if (trim($user['verification_code'] ?? '') !== $code) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid verification code. Please check your email and try again."]);
        exit();
    }

    // Check expiration
    if (!empty($user['verification_expires_at']) && strtotime($user['verification_expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Verification code has expired. Please click 'Resend Code'."]);
        exit();
    }

    // Mark as verified
    $stmtUpdate = $conn->prepare("UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires_at = NULL WHERE id = ?");
    $stmtUpdate->execute([$user['id']]);

    unset($user['password']);
    $user['is_verified'] = 1;

    // Fetch student info
    $studentDetails = null;
    if (!empty($user['student_id'])) {
        $stmtStudent = $conn->prepare("SELECT * FROM students WHERE student_id = ?");
        $stmtStudent->execute([$user['student_id']]);
        $studentDetails = $stmtStudent->fetch();
    }

    $authToken = generateAuthToken($user);

    echo json_encode([
        "status" => "success",
        "message" => "Email verified successfully! You are now logged in.",
        "token" => $authToken,
        "user" => $user,
        "student" => $studentDetails
    ]);

} else if ($action === 'resend_verification') {
    // ------------------------------------------------------------------------
    // RESEND VERIFICATION CODE VIA PHPMAILER
    // ------------------------------------------------------------------------
    $identifier = trim($data['username'] ?? ($data['email'] ?? ($data['student_id'] ?? '')));
    $clientEmail = trim($data['email'] ?? '');

    if (empty($identifier) && empty($clientEmail)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username or email is required."]);
        exit();
    }

    $user = null;
    if (!empty($identifier)) {
        $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? OR student_id = ? OR email = ?");
        $stmt->execute([$identifier, $identifier, $identifier]);
        $user = $stmt->fetch();
    }

    if (!$user && !empty($clientEmail)) {
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$clientEmail]);
        $user = $stmt->fetch();
    }

    if (!$user) {
        $searchKey = !empty($clientEmail) ? $clientEmail : $identifier;
        $stmtSt = $conn->prepare("SELECT student_id, email FROM students WHERE email = ? OR student_id = ? LIMIT 1");
        $stmtSt->execute([$searchKey, $searchKey]);
        $st = $stmtSt->fetch();
        if ($st) {
            $stmt = $conn->prepare("SELECT * FROM users WHERE student_id = ? OR username = ? OR email = ?");
            $stmt->execute([$st['student_id'], $st['student_id'], $st['email']]);
            $user = $stmt->fetch();
        }
    }

    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User account not found."]);
        exit();
    }

    if ((int)($user['is_verified'] ?? 0) === 1) {
        echo json_encode([
            "status" => "success",
            "message" => "Your account is already verified."
        ]);
        exit();
    }

    // Determine target email: users.email -> payload email -> students.email
    $targetEmail = trim($user['email'] ?? '');
    if (empty($targetEmail) && !empty($clientEmail)) {
        $targetEmail = $clientEmail;
    }

    if (empty($targetEmail) && !empty($user['student_id'])) {
        $stmtStEmail = $conn->prepare("SELECT email FROM students WHERE student_id = ?");
        $stmtStEmail->execute([$user['student_id']]);
        $stRow = $stmtStEmail->fetch();
        $targetEmail = trim($stRow['email'] ?? '');
    }

    if (empty($targetEmail)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "No email address found for this account. Please update your email in account settings."]);
        exit();
    }

    // Auto-sync email across users and students tables if missing or outdated
    try {
        if (empty($user['email']) || $user['email'] !== $targetEmail) {
            $syncUsers = $conn->prepare("UPDATE users SET email = ? WHERE id = ?");
            $syncUsers->execute([$targetEmail, $user['id']]);
        }
        if (!empty($user['student_id'])) {
            $syncStudents = $conn->prepare("UPDATE students SET email = ? WHERE student_id = ? AND (email IS NULL OR email = '')");
            $syncStudents->execute([$targetEmail, $user['student_id']]);
        }
    } catch (Exception $syncEx) {
        // Continue even if sync fails
    }

    $newCode = strval(random_int(100000, 999999));
    $newExpires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmtUpdate = $conn->prepare("UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?");
    $stmtUpdate->execute([$newCode, $newExpires, $user['id']]);

    // Send email using PHPMailer
    $mailResult = sendVerificationEmail($targetEmail, $user['name'], $newCode);

    if (empty($mailResult['success'])) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => $mailResult['message'] ?? "Failed to send email via SMTP.",
            "error_detail" => $mailResult['error'] ?? null,
            "target_email" => $targetEmail
        ]);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "email" => $targetEmail,
        "message" => "A new 6-digit verification code has been sent to " . htmlspecialchars($targetEmail) . "."
    ]);

} else if ($action === 'add_teacher') {
    // ------------------------------------------------------------------------
    // CREATE TEACHER ACCOUNT (Server-Side Permission: Admin Only)
    // ------------------------------------------------------------------------
    requireRole(['Admin']);

    if (empty($data['name']) || empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Full Name, Username, and Password are required."]);
        exit();
    }

    $name = trim($data['name']);
    $username = trim($data['username']);
    $email = !empty($data['email']) ? trim($data['email']) : strtolower(str_replace(' ', '.', $name) . '@smartattend.website');
    $password = password_hash(trim($data['password']), PASSWORD_DEFAULT);

    // Check if username already exists
    $stmtCheck = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmtCheck->execute([$username]);
    if ($stmtCheck->fetch()) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username '{$username}' already exists."]);
        exit();
    }

    // Insert into users table with is_verified = 1 for teachers created by admin
    $stmtUser = $conn->prepare("INSERT INTO users (name, username, password, role, is_verified) VALUES (?, ?, ?, 'Teacher', 1)");
    if ($stmtUser->execute([$name, $username, $password])) {
        // Also insert/link into students table with role metadata if email exists so unified table displays email cleanly
        $stmtStudent = $conn->prepare("INSERT INTO students (student_id, first_name, last_name, course, section, birth_date, email) VALUES (?, ?, '', 'Teacher', 'Faculty', CURRENT_DATE(), ?)");
        $stmtStudent->execute([$username, $name, $email]);

        echo json_encode([
            "status" => "success",
            "message" => "Teacher account '{$username}' created successfully!"
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to create Teacher account."]);
    }

} else if ($action === 'get_profile') {
    // ------------------------------------------------------------------------
    // GET PROFILE
    // ------------------------------------------------------------------------
    $user_id = !empty($data['user_id']) ? intval($data['user_id']) : null;
    $username = !empty($data['username']) ? trim($data['username']) : null;

    if (!$user_id && !$username) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "User ID or username is required."]);
        exit();
    }

    if ($user_id) {
        $stmt = $conn->prepare("SELECT id, name, username, role, student_id, email, is_verified, avatar FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
    } else {
        $stmt = $conn->prepare("SELECT id, name, username, role, student_id, email, is_verified, avatar FROM users WHERE username = ?");
        $stmt->execute([$username]);
    }
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found."]);
        exit();
    }

    // Fallback email from students table if user.email is empty
    if (empty($user['email']) && !empty($user['student_id'])) {
        $stmtSt = $conn->prepare("SELECT email FROM students WHERE student_id = ?");
        $stmtSt->execute([$user['student_id']]);
        $st = $stmtSt->fetch();
        if ($st && !empty($st['email'])) {
            $user['email'] = $st['email'];
        }
    }

    echo json_encode(["status" => "success", "user" => $user]);

} else if ($action === 'update_profile') {
    // ------------------------------------------------------------------------
    // UPDATE PROFILE (Name, Avatar)
    // ------------------------------------------------------------------------
    $user_id = !empty($data['user_id']) ? intval($data['user_id']) : null;
    $name = isset($data['name']) ? trim($data['name']) : '';
    $avatar = isset($data['avatar']) ? $data['avatar'] : null;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "User ID is required."]);
        exit();
    }

    $stmtUser = $conn->prepare("SELECT * FROM users WHERE id = ?");
    $stmtUser->execute([$user_id]);
    $user = $stmtUser->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found."]);
        exit();
    }

    if ($avatar !== null && $name !== '') {
        $stmt = $conn->prepare("UPDATE users SET name = ?, avatar = ? WHERE id = ?");
        $stmt->execute([$name, $avatar, $user_id]);
    } else if ($name !== '') {
        $stmt = $conn->prepare("UPDATE users SET name = ? WHERE id = ?");
        $stmt->execute([$name, $user_id]);
    } else if ($avatar !== null) {
        $stmt = $conn->prepare("UPDATE users SET avatar = ? WHERE id = ?");
        $stmt->execute([$avatar, $user_id]);
    }

    // Sync student table if user is Student
    if (!empty($user['student_id']) && $name !== '') {
        $parts = explode(' ', $name, 2);
        $firstName = $parts[0];
        $lastName = $parts[1] ?? '';
        $stmtSt = $conn->prepare("UPDATE students SET first_name = ?, last_name = ? WHERE student_id = ?");
        $stmtSt->execute([$firstName, $lastName, $user['student_id']]);
    }

    // Return updated user
    $stmtRefresh = $conn->prepare("SELECT id, name, username, role, student_id, email, is_verified, avatar FROM users WHERE id = ?");
    $stmtRefresh->execute([$user_id]);
    $updatedUser = $stmtRefresh->fetch();

    echo json_encode([
        "status" => "success",
        "message" => "Profile updated successfully!",
        "user" => $updatedUser
    ]);

} else if ($action === 'request_email_change_otp') {
    // ------------------------------------------------------------------------
    // REQUEST EMAIL CHANGE OTP (Sends 6-digit OTP to NEW email)
    // ------------------------------------------------------------------------
    $user_id = !empty($data['user_id']) ? intval($data['user_id']) : null;
    $new_email = !empty($data['new_email']) ? trim($data['new_email']) : '';

    if (!$user_id || empty($new_email)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "User ID and new email address are required."]);
        exit();
    }

    if (!filter_var($new_email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
        exit();
    }

    $stmtUser = $conn->prepare("SELECT * FROM users WHERE id = ?");
    $stmtUser->execute([$user_id]);
    $user = $stmtUser->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User account not found."]);
        exit();
    }

    // Check if new_email is already used by another user
    $stmtCheck = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmtCheck->execute([$new_email, $user_id]);
    if ($stmtCheck->fetch()) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "This email address is already registered to another account."]);
        exit();
    }

    $code = strval(random_int(100000, 999999));
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmtUp = $conn->prepare("UPDATE users SET pending_email = ?, verification_code = ?, verification_expires_at = ? WHERE id = ?");
    $stmtUp->execute([$new_email, $code, $expires, $user_id]);

    // Send OTP to the new email address
    $mailRes = sendVerificationEmail($new_email, $user['name'], $code, 'email_change');

    if (empty($mailRes['success'])) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => $mailRes['message'] ?? "Failed to send email verification.",
            "error_detail" => $mailRes['error'] ?? null
        ]);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "message" => "A 6-digit confirmation code has been sent to " . htmlspecialchars($new_email) . ".",
        "simulated" => $mailRes['simulated'] ?? false
    ]);

} else if ($action === 'confirm_email_change') {
    // ------------------------------------------------------------------------
    // CONFIRM EMAIL CHANGE WITH OTP
    // ------------------------------------------------------------------------
    $user_id = !empty($data['user_id']) ? intval($data['user_id']) : null;
    $code = !empty($data['code']) ? trim($data['code']) : '';

    if (!$user_id || empty($code)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "User ID and 6-digit verification code are required."]);
        exit();
    }

    $stmtUser = $conn->prepare("SELECT * FROM users WHERE id = ?");
    $stmtUser->execute([$user_id]);
    $user = $stmtUser->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found."]);
        exit();
    }

    if (empty($user['pending_email'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "No pending email change request found. Please request a new code."]);
        exit();
    }

    if (trim($user['verification_code'] ?? '') !== $code) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid verification code. Please check your email and try again."]);
        exit();
    }

    if (!empty($user['verification_expires_at']) && strtotime($user['verification_expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Verification code has expired. Please request a new one."]);
        exit();
    }

    $newEmail = $user['pending_email'];
    $stmtConfirm = $conn->prepare("UPDATE users SET email = ?, pending_email = NULL, verification_code = NULL, verification_expires_at = NULL, is_verified = 1 WHERE id = ?");
    $stmtConfirm->execute([$newEmail, $user_id]);

    // Sync students table if Student
    if (!empty($user['student_id'])) {
        $stmtSt = $conn->prepare("UPDATE students SET email = ? WHERE student_id = ?");
        $stmtSt->execute([$newEmail, $user['student_id']]);
    }

    $stmtRefresh = $conn->prepare("SELECT id, name, username, role, student_id, email, is_verified, avatar FROM users WHERE id = ?");
    $stmtRefresh->execute([$user_id]);
    $updatedUser = $stmtRefresh->fetch();

    echo json_encode([
        "status" => "success",
        "message" => "Email address updated and verified successfully!",
        "user" => $updatedUser
    ]);

} else if ($action === 'request_password_change_otp') {
    // ------------------------------------------------------------------------
    // REQUEST PASSWORD CHANGE OTP (Sends 6-digit OTP to registered email)
    // ------------------------------------------------------------------------
    $user_id = !empty($data['user_id']) ? intval($data['user_id']) : null;
    $identifier = !empty($data['identifier']) ? trim($data['identifier']) : (!empty($data['username']) ? trim($data['username']) : null);

    if (!$user_id && !$identifier) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username, Student ID, or Email is required."]);
        exit();
    }

    if ($user_id) {
        $stmtUser = $conn->prepare("SELECT * FROM users WHERE id = ?");
        $stmtUser->execute([$user_id]);
        $user = $stmtUser->fetch();
    } else {
        $stmtUser = $conn->prepare("SELECT * FROM users WHERE username = ? OR student_id = ? OR email = ?");
        $stmtUser->execute([$identifier, $identifier, $identifier]);
        $user = $stmtUser->fetch();
        if (!$user) {
            $stmtStLookup = $conn->prepare("SELECT student_id FROM students WHERE student_id = ? OR email = ?");
            $stmtStLookup->execute([$identifier, $identifier]);
            $stRow = $stmtStLookup->fetch();
            if ($stRow) {
                $stmtUser2 = $conn->prepare("SELECT * FROM users WHERE student_id = ? OR username = ?");
                $stmtUser2->execute([$stRow['student_id'], $stRow['student_id']]);
                $user = $stmtUser2->fetch();
            }
        }
    }

    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Account not found."]);
        exit();
    }

    $email = $user['email'] ?? '';
    if (empty($email) && !empty($user['student_id'])) {
        $stmtSt = $conn->prepare("SELECT email FROM students WHERE student_id = ?");
        $stmtSt->execute([$user['student_id']]);
        $st = $stmtSt->fetch();
        if ($st) $email = $st['email'];
    }

    if (empty($email)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "No registered email found for this account. Please contact an administrator."]);
        exit();
    }

    $code = strval(random_int(100000, 999999));
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmtUp = $conn->prepare("UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?");
    $stmtUp->execute([$code, $expires, $user['id']]);

    // Send OTP to user's registered email
    $mailRes = sendVerificationEmail($email, $user['name'], $code, 'password_change');

    if (empty($mailRes['success'])) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => $mailRes['message'] ?? "Failed to send password reset code.",
            "error_detail" => $mailRes['error'] ?? null
        ]);
        exit();
    }

    // Mask email for privacy (e.g. j***z@domain.com)
    $emailParts = explode('@', $email);
    $maskedName = substr($emailParts[0], 0, 1) . str_repeat('*', max(strlen($emailParts[0]) - 2, 2)) . substr($emailParts[0], -1);
    $maskedEmail = $maskedName . '@' . ($emailParts[1] ?? '');

    echo json_encode([
        "status" => "success",
        "message" => "A 6-digit code has been sent to {$maskedEmail}.",
        "email" => $maskedEmail,
        "simulated" => $mailRes['simulated'] ?? false
    ]);

} else if ($action === 'confirm_password_change') {
    // ------------------------------------------------------------------------
    // CONFIRM PASSWORD CHANGE WITH OTP
    // ------------------------------------------------------------------------
    $user_id = !empty($data['user_id']) ? intval($data['user_id']) : null;
    $identifier = !empty($data['identifier']) ? trim($data['identifier']) : (!empty($data['username']) ? trim($data['username']) : null);
    $new_password = !empty($data['new_password']) ? trim($data['new_password']) : '';
    $code = !empty($data['code']) ? trim($data['code']) : '';
    $current_password = isset($data['current_password']) ? trim($data['current_password']) : '';

    if ((!$user_id && !$identifier) || empty($new_password) || empty($code)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Please fill out all required fields."]);
        exit();
    }

    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "New password must be at least 6 characters long."]);
        exit();
    }

    if ($user_id) {
        $stmtUser = $conn->prepare("SELECT * FROM users WHERE id = ?");
        $stmtUser->execute([$user_id]);
        $user = $stmtUser->fetch();
    } else {
        $stmtUser = $conn->prepare("SELECT * FROM users WHERE username = ? OR student_id = ? OR email = ?");
        $stmtUser->execute([$identifier, $identifier, $identifier]);
        $user = $stmtUser->fetch();
        if (!$user) {
            $stmtStLookup = $conn->prepare("SELECT student_id FROM students WHERE student_id = ? OR email = ?");
            $stmtStLookup->execute([$identifier, $identifier]);
            $stRow = $stmtStLookup->fetch();
            if ($stRow) {
                $stmtUser2 = $conn->prepare("SELECT * FROM users WHERE student_id = ? OR username = ?");
                $stmtUser2->execute([$stRow['student_id'], $stRow['student_id']]);
                $user = $stmtUser2->fetch();
            }
        }
    }

    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found."]);
        exit();
    }

    // If current_password is provided, check it
    if (!empty($current_password) && !password_verify($current_password, $user['password']) && $user['password'] !== $current_password) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Current password does not match."]);
        exit();
    }

    // Verify OTP code
    if (trim($user['verification_code'] ?? '') !== $code) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid verification code. Please check your email and try again."]);
        exit();
    }

    if (!empty($user['verification_expires_at']) && strtotime($user['verification_expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Verification code has expired. Please request a new code."]);
        exit();
    }

    $newHash = password_hash($new_password, PASSWORD_DEFAULT);
    $stmtUp = $conn->prepare("UPDATE users SET password = ?, verification_code = NULL, verification_expires_at = NULL WHERE id = ?");
    $stmtUp->execute([$newHash, $user_id]);

    echo json_encode([
        "status" => "success",
        "message" => "Password updated successfully!"
    ]);
}
?>
