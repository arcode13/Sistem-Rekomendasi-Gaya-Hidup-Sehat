import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from loguru import logger


class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_encryption = os.getenv("SMTP_ENCRYPTION", "tls").lower()
        self.smtp_sender = os.getenv("SMTP_SENDER", "")
        
    def is_configured(self) -> bool:
        """Check if SMTP is properly configured"""
        return all([
            self.smtp_host,
            self.smtp_username,
            self.smtp_password,
            self.smtp_sender
        ])
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """
        Send an email using SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text content (optional, will use HTML if not provided)
        
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.error("SMTP not configured. Please set SMTP_* environment variables.")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_sender
            msg['To'] = to_email
            
            if text_body:
                text_part = MIMEText(text_body, 'plain')
                msg.attach(text_part)
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            if self.smtp_encryption == "tls":
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            elif self.smtp_encryption == "ssl":
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_password_reset_email(self, to_email: str, reset_token: str, reset_url: str, user_name: Optional[str] = None) -> bool:
        """
        Send password reset email
        
        Args:
            to_email: Recipient email address
            reset_token: Password reset token
            reset_url: URL to reset password page (with token)
            user_name: User's name (optional, will use generic greeting if not provided)
        
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = "Reset Kata Sandi - Ayo Hidup Sehat"
        
        current_year = datetime.now().year
        greeting = f"Halo {user_name}," if user_name else "Halo,"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background-color: #f9f9f9;
                    border-radius: 8px;
                    padding: 30px;
                    border: 1px solid #e0e0e0;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    color: #2c3e50;
                    margin: 0;
                }}
                .content {{
                    background-color: white;
                    padding: 25px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #89c54b 0%, #ef4b37 100%);
                    color: white !important;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .button:hover {{
                    opacity: 0.9;
                }}
                .footer {{
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    margin-top: 20px;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Ayo Hidup Sehat</h1>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Jika Anda tidak meminta ini, silakan abaikan email ini.</p>
                    <p>Untuk mereset kata sandi Anda, klik tombol di bawah ini:</p>
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Kata Sandi</a>
                    </div>
                    <p>Atau salin dan tempel link berikut di browser Anda:</p>
                    <p style="word-break: break-all; color: #667eea;">{reset_url}</p>
                    <div class="warning">
                        <strong>⚠️ Penting:</strong> Link ini akan kedaluwarsa dalam 1 jam. Jika link sudah kedaluwarsa, silakan minta reset kata sandi baru.
                    </div>
                    <p>Jika Anda tidak meminta reset kata sandi, abaikan email ini dan kata sandi Anda tidak akan berubah.</p>
                </div>
                <div class="footer">
                    <p>Email ini dikirim secara otomatis, mohon jangan membalas email ini.</p>
                    <p>&copy; {current_year} Ayo Hidup Sehat. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Reset Kata Sandi - Ayo Hidup Sehat
        
        {greeting}
        
        Kami menerima permintaan untuk mereset kata sandi akun Anda. Jika Anda tidak meminta ini, silakan abaikan email ini.
        
        Untuk mereset kata sandi Anda, klik link berikut:
        {reset_url}
        
        PENTING: Link ini akan kedaluwarsa dalam 1 jam. Jika link sudah kedaluwarsa, silakan minta reset kata sandi baru.
        
        Jika Anda tidak meminta reset kata sandi, abaikan email ini dan kata sandi Anda tidak akan berubah.
        
        Email ini dikirim secara otomatis, mohon jangan membalas email ini.
        
        © {current_year} Ayo Hidup Sehat. All rights reserved.
        """
        
        return self.send_email(to_email, subject, html_body, text_body)


email_service = EmailService()