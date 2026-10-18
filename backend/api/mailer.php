<?php
// mailer.php - PHPMailer Email Service for SmartAttend

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../libs/PHPMailer/Exception.php';
require_once __DIR__ . '/../libs/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../libs/PHPMailer/SMTP.php';
require_once __DIR__ . '/config.php';

/**
 * Append an entry to backend/logs/mail.log with timestamp
 */
function writeMailLog($level, $message, $context = []) {
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/mail.log';
    $time = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' | ' . json_encode($context, JSON_UNESCAPED_SLASHES) : '';
    $line = "[{$time}] [{$level}] {$message}{$contextStr}" . PHP_EOL;
    @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
}

/**
 * Sends a modern 6-digit verification code email to a user.
 *
 * @param string $toEmail Recipient email address
 * @param string $recipientName Recipient full name
 * @param string $verificationCode 6-digit numeric verification code
 * @param string $purpose 'verification' | 'email_change' | 'password_change'
 * @return array Status result ['success' => bool, 'message' => string, 'details' => string]
 */
function sendVerificationEmail($toEmail, $recipientName, $verificationCode, $purpose = 'verification') {
    if (empty($toEmail) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        writeMailLog('ERROR', "Invalid recipient email provided: '{$toEmail}'");
        return [
            'success' => false,
            'message' => 'Invalid recipient email address.',
            'error' => 'Invalid recipient email format'
        ];
    }

    $mail = new PHPMailer(true);

    // Read SMTP settings from environment variables
    $smtp_host   = getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? 'localhost');
    $smtp_port   = intval(getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 587));
    $smtp_user   = getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? '');
    $smtp_pass   = getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? '');
    $smtp_secure = strtolower(getenv('SMTP_SECURE') ?: ($_ENV['SMTP_SECURE'] ?? 'tls'));
    $from_email  = getenv('SMTP_FROM_EMAIL') ?: ($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@smartattend.website');
    $from_name   = getenv('SMTP_FROM_NAME') ?: ($_ENV['SMTP_FROM_NAME'] ?? 'SmartAttend');

    writeMailLog('INFO', "Initiating send [purpose: {$purpose}] to {$toEmail}", [
        'smtp_host' => $smtp_host,
        'smtp_port' => $smtp_port,
        'smtp_user' => !empty($smtp_user) ? substr($smtp_user, 0, 3) . '***' : '(empty)',
        'has_pass'  => !empty($smtp_pass),
        'secure'    => $smtp_secure,
        'from'      => $from_email
    ]);

    try {
        // Server Settings
        $mail->isSMTP();
        $mail->Host       = $smtp_host;
        $mail->Port       = $smtp_port;
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 15;

        // Authentication & Encryption
        if (!empty($smtp_user)) {
            $mail->SMTPAuth   = true;
            $mail->Username   = $smtp_user;
            $mail->Password   = $smtp_pass;
        } else {
            $mail->SMTPAuth   = false;
        }

        if ($smtp_secure === 'ssl' || $smtp_secure === 'ssl/tls' || $smtp_port === 465) {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else if ($smtp_secure === 'tls' || $smtp_port === 587) {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPSecure = false;
            $mail->SMTPAutoTLS = false;
        }

        // cPanel SSL verification options
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];

        // Recipients
        $mail->setFrom($from_email, $from_name);
        $mail->addAddress($toEmail, !empty($recipientName) ? $recipientName : 'User');

        $safeName = htmlspecialchars($recipientName ?: 'there', ENT_QUOTES, 'UTF-8');
        $safeCode = htmlspecialchars($verificationCode, ENT_QUOTES, 'UTF-8');
        $safeToEmail = htmlspecialchars($toEmail, ENT_QUOTES, 'UTF-8');

        // Human, clear tone based on purpose
        if ($purpose === 'email_change') {
            $emailSubject = 'Confirm your new SmartAttend email';
            $mainMsg      = "We received a request to change your SmartAttend account email to <strong>{$safeToEmail}</strong>. Please use the code below to confirm this change:";
            $altMsg       = "We received a request to change your SmartAttend account email to {$safeToEmail}.";
        } else if ($purpose === 'password_change') {
            $emailSubject = 'SmartAttend password reset code';
            $mainMsg      = 'We received a request to update your SmartAttend account password. Please use the code below to continue:';
            $altMsg       = 'We received a request to update your SmartAttend account password.';
        } else {
            $emailSubject = 'Your SmartAttend verification code: ' . $verificationCode;
            $mainMsg      = 'Here is your 6-digit code to verify your SmartAttend account:';
            $altMsg       = 'Here is your 6-digit code to verify your SmartAttend account:';
        }

        // Content
        $mail->isHTML(true);
        $mail->Subject = $emailSubject;

        $mail->Body = "
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>{$emailSubject}</title>
        </head>
        <body style='margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;'>
          <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='background-color: #f8fafc; padding: 36px 12px;'>
            <tr>
              <td align='center'>
                <table role='presentation' width='100%' style='max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: left;'>
                  <tr>
                    <td style='padding-bottom: 20px;'>
                      <div style='display: inline-block; font-weight: 800; font-size: 18px; color: #0f172a; letter-spacing: -0.5px;'>
                        SmartAttend
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p style='font-size: 15px; margin: 0 0 14px 0; color: #334155;'>
                        Hi {$safeName},
                      </p>
                      <p style='font-size: 15px; margin: 0 0 20px 0; color: #334155;'>
                        {$mainMsg}
                      </p>
                      <div style='background-color: #f1f5f9; border-radius: 6px; padding: 18px 24px; text-align: center; margin: 0 0 22px 0;'>
                        <span style='font-family: SFMono-Regular, Consolas, \"Liberation Mono\", Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; display: inline-block;'>
                          {$safeCode}
                        </span>
                      </div>
                      <p style='font-size: 14px; margin: 0 0 12px 0; color: #64748b;'>
                        This code will expire in 15 minutes.
                      </p>
                      <p style='font-size: 14px; margin: 0 0 24px 0; color: #64748b;'>
                        If you didn't request this code, you can safely ignore this email. No changes will be made without it.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style='border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px;'>
                      <p style='font-size: 12px; color: #94a3b8; margin: 0;'>
                        This automated message was sent to {$safeToEmail}.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        ";

        $mail->AltBody = "Hi {$safeName},\n\n{$altMsg}\n\nYour code: {$verificationCode}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\nThanks,\nSmartAttend Team";

        $mail->send();

        writeMailLog('SUCCESS', "Email successfully sent to {$toEmail} via {$smtp_host}:{$smtp_port}");

        return [
            'success' => true,
            'message' => 'Verification code sent to ' . $toEmail
        ];

    } catch (Exception $e) {
        $errorMessage = $mail->ErrorInfo ?: $e->getMessage();
        error_log("PHPMailer send failed to {$toEmail}: " . $errorMessage);
        writeMailLog('FAIL', "Failed to send email to {$toEmail}. Error: {$errorMessage}", [
            'host' => $smtp_host,
            'port' => $smtp_port,
            'user' => $smtp_user,
            'has_password' => !empty($smtp_pass)
        ]);

        $isLocal = ($_SERVER['HTTP_HOST'] ?? '') === 'localhost' || ($_SERVER['HTTP_HOST'] ?? '') === '127.0.0.1';
        return [
            'success' => $isLocal,
            'simulated' => $isLocal,
            'error' => $errorMessage,
            'message' => $isLocal 
                ? "Verification email simulated locally (Code: {$verificationCode})" 
                : "Unable to send verification email. " . $errorMessage
        ];
    }
}
?>
