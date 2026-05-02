<?php
/**
 * Password reset endpoint
 * Accepts POST with 'email' or 'username' or 'identifier'
 * Sends a password reset email using PHPMailer if available, else falls back to mail().
 *
 * Configure SMTP by setting environment variables or editing the SMTP_* constants below.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

function sendJson($statusCode, $data) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$input = $_POST + json_decode(file_get_contents('php://input'), true);
$identifier = trim($input['email'] ?? $input['username'] ?? $input['identifier'] ?? '');

if (empty($identifier)) {
    sendJson(400, ['status' => 'error', 'message' => 'Missing email or username']);
}

// Attempt to ensure $conn exists (many APIs in this repo provide $conn)
if (!isset($conn)) {
    // Try including local db.php variations
    if (file_exists(__DIR__ . '/db.php')) {
        require_once __DIR__ . '/db.php';
    } elseif (file_exists(__DIR__ . '/../db.php')) {
        require_once __DIR__ . '/../db.php';
    }
}

if (!isset($conn) || ($conn instanceof mysqli && $conn->connect_error)) {
    // We can still attempt to send reset but cannot verify user existence without DB
    sendJson(500, ['status' => 'error', 'message' => 'Database connection not available']);
}

// Look up user by email or username
$stmt = $conn->prepare('SELECT id, email, username, fullName FROM users WHERE email = ? OR username = ? LIMIT 1');
if (!$stmt) {
    sendJson(500, ['status' => 'error', 'message' => 'Failed to prepare statement', 'error' => $conn->error]);
}

$stmt->bind_param('ss', $identifier, $identifier);
if (!$stmt->execute()) {
    sendJson(500, ['status' => 'error', 'message' => 'Query failed', 'error' => $stmt->error]);
}

$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    // For security do not reveal whether account exists
    sendJson(200, ['status' => 'success', 'message' => 'If an account exists for that identifier, a reset email has been sent.']);
}

$userId = (int)$user['id'];
$userEmail = $user['email'];
$userName = $user['fullName'] ?: $user['username'] ?: $userEmail;

// Generate secure token
$token = bin2hex(random_bytes(24));
$expires = date('Y-m-d H:i:s', time() + 3600); // 1 hour

// Try to save token to users table if columns exist, else try password_resets table
$saved = false;
// Try update users table
try {
    $upd = $conn->prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?');
    if ($upd) {
        $upd->bind_param('ssi', $token, $expires, $userId);
        $saved = $upd->execute();
        $upd->close();
    }
} catch (Throwable $e) {
    $saved = false;
}

if (!$saved) {
    // Try inserting into password_resets table
    try {
        $ins = $conn->prepare('INSERT INTO password_resets (`email`, `token`, `expires_at`) VALUES (?, ?, ?)');
        if ($ins) {
            $ins->bind_param('sss', $userEmail, $token, $expires);
            $saved = $ins->execute();
            $ins->close();
        }
    } catch (Throwable $e) {
        $saved = false;
    }
}

if (!$saved) {
    // Not fatal: proceed to send email but inform in logs
    error_log('Warning: failed to persist password reset token for user ' . $userEmail);
}

// Build reset link — adjust BASE_URL to your frontend reset route
$baseUrl = getenv('APP_BASE_URL') ?: 'https://your-app.example.com';
$resetPath = '/reset-password.php';
$resetLink = rtrim($baseUrl, '/') . $resetPath . '?token=' . urlencode($token) . '&email=' . urlencode($userEmail);

// PHPMailer SMTP configuration (edit or set environment variables)
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.example.com');
define('SMTP_PORT', getenv('SMTP_PORT') ?: 587);
define('SMTP_USER', getenv('SMTP_USER') ?: 'smtp-user@example.com');
define('SMTP_PASS', getenv('SMTP_PASS') ?: 'smtp-password');
define('SMTP_SECURE', getenv('SMTP_SECURE') ?: 'tls');
define('SMTP_FROM', getenv('SMTP_FROM') ?: 'no-reply@example.com');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'RapidRepair');

$subject = 'Password Reset Request';
$bodyHtml = "<p>Hi " . htmlentities($userName) . ",</p>\n" .
    "<p>We received a request to reset your password. Click the link below to reset it — the link will expire in 1 hour.</p>\n" .
    "<p><a href=\"" . htmlentities($resetLink) . "\">Reset password</a></p>\n" .
    "<p>If you didn't request this, you can ignore this message.</p>";

$bodyText = "Hi " . $userName . ",\n\n" .
    "We received a request to reset your password. Use the link below to reset it (expires in 1 hour):\n\n" . $resetLink . "\n\n" .
    "If you didn't request this, ignore this message.";

$mailSent = false;

// Try PHPMailer if available
if (file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/src/SMTP.php';

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USER;
        $mail->Password = SMTP_PASS;
        $mail->SMTPSecure = SMTP_SECURE;
        $mail->Port = (int)SMTP_PORT;

        $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
        $mail->addAddress($userEmail, $userName);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $bodyHtml;
        $mail->AltBody = $bodyText;

        $mailSent = $mail->send();
    } catch (Exception $e) {
        error_log('PHPMailer error: ' . $e->getMessage());
        $mailSent = false;
    }
} else {
    // Fallback to PHP mail()
    $headers = 'From: ' . SMTP_FROM_NAME . ' <' . SMTP_FROM . ">\r\n" .
        "MIME-Version: 1.0\r\n" .
        "Content-Type: text/html; charset=UTF-8\r\n";

    $mailSent = mail($userEmail, $subject, $bodyHtml, $headers);
}

if ($mailSent) {
    sendJson(200, ['status' => 'success', 'message' => 'If an account exists for that identifier, a reset email has been sent.']);
} else {
    sendJson(500, ['status' => 'error', 'message' => 'Failed to send reset email']);
}

?>
