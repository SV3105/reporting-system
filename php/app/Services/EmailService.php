<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    public static function sendReport(string $toEmail, string $reportName, string $htmlContent): bool
    {
        $mail = new PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host       = getenv('SMTP_HOST') ?: 'localhost';
            $mail->Port       = getenv('SMTP_PORT') ?: 1025;
            $mail->SMTPAuth   = false; // Assuming Mailhog/Local for now
            
            // Recipients
            $mail->setFrom('reports@system.com', 'Reporting System');
            $mail->addAddress($toEmail);

            // Content
            $mail->isHTML(true);
            $mail->Subject = "Daily Report: " . $reportName;
            $mail->Body    = "
                <h2>Scheduled Report: {$reportName}</h2>
                <p>Hello, please find your daily report below:</p>
                <div style='overflow-x: auto;'>
                    {$htmlContent}
                </div>
                <p>Regards,<br>Reporting System</p>
            ";

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("Email sending failed: {$mail->ErrorInfo}");
            return false;
        }
    }
}
