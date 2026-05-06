"""
Email Service
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from flask import current_app, render_template
from backend.models import EmailQueue
from backend.extensions import db
from backend.utils.url import get_public_frontend_base_url
from datetime import datetime

def _first_name(user):
    """Get first name from user data for email salutation."""
    full = (user.data or {}).get('full_name') or 'User'
    print(f"_first_name - full: {full}")
    return (full.strip().split(None, 1)[0] if full.strip() else 'User')


class EmailService:
    """Service for sending emails"""
    
    @staticmethod
    def queue_email(recipient, subject, body, body_html=None, metadata=None):
        """Queue an email for sending"""
        email = EmailQueue(
            recipient=recipient,
            subject=subject,
            body=body,
            body_html=body_html,
            status='pending',
            meta_data=metadata or {}
        )
        db.session.add(email)
        db.session.commit()
        return email
    
    @staticmethod
    def send_email(email_id=None, recipient=None, subject=None, body=None, body_html=None):
        """
        Send email using Flask-Mail
        
        Can either send directly (if recipient, subject, body provided)
        or send from queue (if email_id provided)
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info("send_email: email_id=%s", email_id)
        if email_id:
            # Send from queue
            email = EmailQueue.query.get(email_id)
            if not email:
                raise ValueError(f"Email {email_id} not found in queue")
            if email.status == 'sent':
                return email  # Already sent
            
            recipient = email.recipient.strip()
            subject = email.subject
            body = email.body
            body_html = email.body_html
        else:
            if not recipient or not subject or not body:
                raise ValueError("recipient, subject, and body are required")
            recipient = recipient.strip()
        
        try:
            # Get settings from app config
            host = current_app.config.get('MAIL_SERVER')
            port = current_app.config.get('MAIL_PORT')
            user = current_app.config.get('MAIL_USERNAME')
            password = current_app.config.get('MAIL_PASSWORD')
            from_name = current_app.config.get('DEFAULT_FROM_NAME') or 'Mzansi Serve'
            default_from = current_app.config.get('DEFAULT_FROM_EMAIL') or user
            default_reply_to = current_app.config.get('DEFAULT_REPLY_TO_EMAIL') or default_from
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Attempting to send email: To={recipient}, Host={host}, Port={port}, User={user}, From={default_from}, ReplyTo={default_reply_to}")

            if not host or not user or not password:
                missing = []
                if not host: missing.append("MAIL_SERVER")
                if not user: missing.append("MAIL_USERNAME")
                if not password: missing.append("MAIL_PASSWORD")
                raise ValueError(f"Email configuration is incomplete (missing: {', '.join(missing)})")

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = f"{from_name} <{default_from}>"
            msg['Sender'] = default_from
            msg['Reply-To'] = default_reply_to
            msg['To'] = recipient
            
            # Explicitly use utf-8 for body parts
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            if body_html:
                msg.attach(MIMEText(body_html, 'html', 'utf-8'))

            # Send email
            # Use SSL for port 465, TLS/STARTTLS for others (like 587)
            if str(port) == '465':
                server = smtplib.SMTP_SSL(host, int(port), timeout=15)
            else:
                server = smtplib.SMTP(host, int(port), timeout=15)
                server.starttls()
            
            server.login(user, password)
            # The ENVELOPE sender must be the authenticated user for Gmail
            server.sendmail(user, [recipient], msg.as_string())
            server.quit()
            
            logger.info(f"Email successfully sent to {recipient}")
            
            # Update queue status
            if email_id:
                email.status = 'sent'
                email.sent_at = datetime.utcnow()
                db.session.commit()
            
            return True
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"STRICT EMAIL FAILURE: To={recipient}, Host={host}, Error={str(e)}")
            # Update queue if applicable
            if email_id:
                email.status = 'failed'
                email.error_message = str(e)
                try:
                    db.session.commit()
                except:
                    db.session.rollback()
            return False
    
    @staticmethod
    def send_verification_email(user, token):
        """Send email verification email"""
        frontend_url = get_public_frontend_base_url()
        verification_url = f"{frontend_url}/verify-email?token={token}"
        first_name = _first_name(user)
        subject = "Verify Your Email Address - Welcome to MzansiServe"
        body = f"""Hi {first_name},

Welcome to MzansiServe 

To complete your registration, please verify your email address by clicking the button below:

Verify My Email: {verification_url}

If you did not create this account, you can safely ignore this email.

Thank you for joining South Africa's trusted marketplace for services, professionals, drivers, and shops.

Warm regards,
MzansiServe Support Team
www.mzansiserve.co.za"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Welcome to MzansiServe</p>
<p>To complete your registration, please verify your email address by clicking the button below:</p>
<p><a href="{verification_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Verify My Email</a></p>
<p>If you did not create this account, you can safely ignore this email.</p>
<p>Thank you for joining South Africa's trusted marketplace for services, professionals, drivers, and shops.</p>
<p>Warm regards,<br>MzansiServe Support Team<br><a href="https://www.mzansiserve.co.za">www.mzansiserve.co.za</a></p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'verification', 'user_id': str(user.id)}
        )
        EmailService.send_email(email_id=email.id)
        return email

    @staticmethod
    def send_password_reset_email(user, token):
        """Send password reset email"""
        frontend_url = get_public_frontend_base_url()
        reset_url = f"{frontend_url}/reset-password?token={token}"
        
        first_name = _first_name(user)
        subject = "Reset Your Password - MzansiServe"
        body = f"Hi {first_name},\n\nReset your password by clicking the link: {reset_url}"
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: center;">
<p>Hi {first_name},</p>
<p>You requested to reset your password. Click the button below to set a new password:</p>
<p><a href="{reset_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Reset My Password</a></p>
<p>If you did not request this, you can safely ignore this email.</p>
<p>Warm regards,<br>MzansiServe Team</p>
</body></html>"""
        
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'password_reset', 'user_id': str(user.id)}
        )
        EmailService.send_email(email_id=email.id)
        return email
  
    @staticmethod
    def send_registration_confirmation(user):
        """Send email informing user they have successfully registered."""
        first_name = _first_name(user)
        frontend_url = get_public_frontend_base_url()
        login_url = f"{frontend_url}/login"
        subject = "Registration Successful - Welcome to MzansiServe!"
        body = f"""Hi {first_name},

Great news! Your registration on MzansiServe was successful 

Your account is now active, and you can start exploring:
- Local professionals & service providers
- Driver bookings
- Online shopping
- Secure payments

Login anytime here: {login_url} or directly from the mzansiserve mobile app, www.MzansiServe.com or www.MzansiServe.co.za

Thank you for choosing MzansiServe - made for Mzansi, built for you

Kind regards,
MzansiServe Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Great news! Your registration on MzansiServe was successful</p>
<p>Your account is now active, and you can start exploring:</p>
<ul>
    <li>Local professionals & service providers</li>
    <li>Driver bookings</li>
    <li>Online shopping</li>
    <li>Secure payments</li>
</ul>
<p>Login anytime here: <a href="{login_url}">{login_url}</a> or directly from the mzansiserve mobile app, <a href="https://www.MzansiServe.com">www.MzansiServe.com</a> or <a href="https://www.MzansiServe.co.za">www.MzansiServe.co.za</a></p>
<p>Thank you for choosing MzansiServe - made for Mzansi, built for you</p>
<p>Kind regards,<br>MzansiServe Team</p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'registration_confirmation', 'user_id': str(user.id)}
        )
        EmailService.send_email(email_id=email.id)
        return email
    
    @staticmethod
    def send_registration_payment_confirmation(user, payment_amount):
        """Send registration payment acknowledgement email."""
        first_name = _first_name(user)
        payment_date = datetime.utcnow().strftime('%Y-%m-%d')
        reference = getattr(user, 'tracking_number', None) or 'Registration'
        if user.role == 'client':
            subject = "Registration Completed - Welcome to MzansiServe"
            body = f"""Hi {first_name},

Thank you. Your registration has been completed successfully.

Amount Paid: R{payment_amount:.2f}
Date: {payment_date}
Reference: {reference}

Your account is active and ready to use.

Regards,
MzansiServe Billing Team
billing@mzansiserve.co.za"""
            body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Thank you. Your registration has been completed successfully.</p>
<p><strong>Amount Paid:</strong> R{payment_amount:.2f}<br>
<strong>Date:</strong> {payment_date}<br>
<strong>Reference:</strong> {reference}</p>
<p>Your account is active and ready to use.</p>
<p>Regards,<br>MzansiServe Billing Team<br><a href="mailto:billing@mzansiserve.co.za">billing@mzansiserve.co.za</a></p>
</body></html>"""
        else:
            account_type = (user.role or 'member').replace('-', ' ').title()
            subject = "Registration Payment Received - Pending Admin Approval"
            body = f"""Hi {first_name},

Thank you. We have received your registration payment and created your MzansiServe {account_type} account.

Amount Paid: R{payment_amount:.2f}
Date: {payment_date}
Reference: {reference}
Current Status: Pending admin approval

Your registration is now awaiting review by the system administrator. You will receive another email as soon as your account has been approved.

Regards,
MzansiServe Billing Team
billing@mzansiserve.co.za"""
            body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Thank you. We have received your registration payment and created your MzansiServe <strong>{account_type}</strong> account.</p>
<p><strong>Amount Paid:</strong> R{payment_amount:.2f}<br>
<strong>Date:</strong> {payment_date}<br>
<strong>Reference:</strong> {reference}<br>
<strong>Current Status:</strong> Pending admin approval</p>
<p>Your registration is now awaiting review by the system administrator. You will receive another email as soon as your account has been approved.</p>
<p>Regards,<br>MzansiServe Billing Team<br><a href="mailto:billing@mzansiserve.co.za">billing@mzansiserve.co.za</a></p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'registration_payment', 'user_id': str(user.id), 'amount': float(payment_amount)}
        )
        EmailService.send_email(email_id=email.id)
        return email

    @staticmethod
    def send_registration_payment_reminder(user):
        """Send reminder to complete the registration fee before admin approval can continue."""
        from backend.services.profile_service import REGISTRATION_FEE_AMOUNT

        first_name = _first_name(user)
        frontend_url = get_public_frontend_base_url()
        login_url = f"{frontend_url}/login"
        account_type = (user.role or 'member').replace('-', ' ').title()
        payment_amount = float(REGISTRATION_FEE_AMOUNT) / 100.0
        reference = getattr(user, 'tracking_number', None) or 'Registration'

        subject = "Complete Your Registration Payment to Activate MzansiServe"
        body = f"""Hi {first_name},

Your MzansiServe {account_type} account is almost ready, but your registration fee is still outstanding.

Registration Fee Due: R{payment_amount:.2f}
Reference: {reference}

Please log in to your account and complete the registration payment so our admin team can continue with your approval and activate your access to the system.

Login here: {login_url}

Once payment is received, your account can move forward for approval.

Warm regards,
MzansiServe Billing Team
billing@mzansiserve.co.za"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: left;">
<p>Hi {first_name},</p>
<p>Your MzansiServe <strong>{account_type}</strong> account is almost ready, but your registration fee is still outstanding.</p>
<p><strong>Registration Fee Due:</strong> R{payment_amount:.2f}<br>
<strong>Reference:</strong> {reference}</p>
<p>Please log in to your account and complete the registration payment so our admin team can continue with your approval and activate your access to the system.</p>
<p><a href="{login_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Login to Complete Payment</a></p>
<p>Once payment is received, your account can move forward for approval.</p>
<p>Warm regards,<br>MzansiServe Billing Team<br><a href="mailto:billing@mzansiserve.co.za">billing@mzansiserve.co.za</a></p>
</body></html>"""

        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'registration_payment_reminder', 'user_id': str(user.id)}
        )
        EmailService.send_email(email_id=email.id)
        return email
    
    @staticmethod
    def send_shop_purchase_confirmation(user, order):
        """Send shop purchase payment confirmation email"""
        first_name = _first_name(user)
        order_date = (order.placed_at.strftime('%Y-%m-%d %H:%M') if order.placed_at else '') or 'N/A'
        shipping = order.shipping if isinstance(order.shipping, dict) else {}
        delivery_address = shipping.get('address') or shipping.get('delivery_address') or str(shipping) if shipping else 'N/A'
        if isinstance(delivery_address, dict):
            parts = [delivery_address.get('street'), delivery_address.get('city'), delivery_address.get('postal_code')]
            delivery_address = ', '.join(p for p in parts if p) or 'N/A'
        subject = "Order Confirmed - Thank You for Shopping with MzansiServe"
        body = f"""Hi {first_name},

Thank you for your purchase on MzansiServe Shop

Order Number: {order.id}
Total Amount: R{float(order.total):.2f}
Delivery Address: {delivery_address}
Order Date: {order_date}

You will receive another update once your order is dispatched.

Warm regards,
MzansiServe Shop Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Thank you for your purchase on MzansiServe Shop</p>
<p><strong>Order Number:</strong> {order.id}<br>
<strong>Total Amount:</strong> R{float(order.total):.2f}<br>
<strong>Delivery Address:</strong> {delivery_address}<br>
<strong>Order Date:</strong> {order_date}</p>
<p>You will receive another update once your order is dispatched.</p>
<p>Warm regards,<br>MzansiServe Shop Team</p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'shop_purchase', 'user_id': str(user.id), 'order_id': order.id}
        )
        EmailService.send_email(email_id=email.id)
        return email

    @staticmethod
    def send_callout_payment_confirmation(user, service_request, payment_amount):
        """Send call-out payment confirmation email for professional/driver service requests"""
        first_name = _first_name(user)
        provider = getattr(service_request, 'provider', None)
        provider_name = 'Service Provider'
        if provider and provider.data:
            provider_name = (provider.data.get('full_name') or provider.email or provider_name)
        service_name = (service_request.request_type or 'service').replace('_', ' ').title()
        booking_date = service_request.scheduled_date or ''
        if service_request.scheduled_time:
            booking_date = f"{booking_date} {service_request.scheduled_time}".strip()
        booking_date = booking_date or 'N/A'
        subject = "Call-Out Payment Confirmed - Service Booking Successful"
        body = f"""Hi {first_name},

Your call-out payment has been successfully processed

Service Provider: {provider_name}
Service Requested: {service_name}
Call-Out Fee Paid: R{payment_amount:.2f}
Booking Date: {booking_date}

The provider will contact you shortly.

Regards,
MzansiServe Support Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Your call-out payment has been successfully processed</p>
<p><strong>Service Provider:</strong> {provider_name}<br>
<strong>Service Requested:</strong> {service_name}<br>
<strong>Call-Out Fee Paid:</strong> R{payment_amount:.2f}<br>
<strong>Booking Date:</strong> {booking_date}</p>
<p>The provider will contact you shortly.</p>
<p>Regards,<br>MzansiServe Support Team</p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'callout_payment', 'user_id': str(user.id), 'request_id': service_request.id}
        )
        EmailService.send_email(email_id=email.id)
        return email
    
    @staticmethod
    def send_id_verification_notification(user, status, reason=None):
        """Send ID verification status notification email"""
        user_name = user.data.get('full_name', 'User') if user.data else 'User'
        
        if status == 'verified':
            body = f"""
Dear {user_name},

Great news! Your ID document has been verified.

Your account verification is now complete, and you can enjoy full access to all MzansiServe services.

Thank you for your patience.

Best regards,
MzansiServe Team
            """.strip()
            
            body_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>ID Verification Successful</h2>
                <p>Dear {user_name},</p>
                <p>Great news! Your ID document has been verified.</p>
                <p>Your account verification is now complete, and you can enjoy full access to all MzansiServe services.</p>
                <p>Thank you for your patience.</p>
                <p>Best regards,<br>MzansiServe Team</p>
            </body>
            </html>
            """
            subject = "ID Verification Successful - MzansiServe"
        else:  # rejected
            body = f"""
Dear {user_name},

We regret to inform you that your ID document verification was not successful.

Reason: {reason or 'Not specified'}

Please upload a new, clear ID document through your profile page for re-verification.

If you have any questions, please contact our support team.

Best regards,
MzansiServe Team
            """.strip()
            
            body_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>ID Verification Update</h2>
                <p>Dear {user_name},</p>
                <p>We regret to inform you that your ID document verification was not successful.</p>
                <p><strong>Reason:</strong> {reason or 'Not specified'}</p>
                <p>Please upload a new, clear ID document through your profile page for re-verification.</p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br>MzansiServe Team</p>
            </body>
            </html>
            """
            subject = "ID Verification Update - MzansiServe"
        
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'id_verification', 'user_id': str(user.id), 'status': status}
        )
        EmailService.send_email(email_id=email.id)
        return email
    
    @staticmethod
    def send_user_approval_notification(user):
        """Send user approval notification email"""
        first_name = _first_name(user)
        frontend_url = get_public_frontend_base_url()
        dashboard_url = f"{frontend_url}/dashboard"
        account_type = (user.role or 'member').replace('-', ' ').title()
        subject = "Account Approved - Welcome to MzansiServe!"
        body = f"""Hi {first_name},

Congratulations

Your account has been successfully reviewed and approved!

You are now authorised as a: {account_type}

Access your dashboard here: {dashboard_url}

Warm regards,
MzansiServe Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Congratulations</p>
<p>Your account has been successfully reviewed and approved!</p>
<p>You are now authorised as a: <strong>{account_type}</strong></p>
<p>Access your dashboard here: <a href="{dashboard_url}">{dashboard_url}</a></p>
<p>Warm regards,<br>MzansiServe Team</p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'user_approval', 'user_id': str(user.id)}
        )
        EmailService.send_email(email_id=email.id)
        return email
    
    @staticmethod
    def send_user_suspension_notification(user, reason=None):
        """Send user suspension notification email. reason is optional."""
        first_name = _first_name(user)
        suspension_reason = (reason or '').strip() or 'Please contact support for details.'
        support_email = current_app.config.get('SUPPORT_EMAIL') or 'support@mzansiserve.co.za'
        subject = "Account Suspended - Important Notice"
        body = f"""Hi {first_name},

We regret to inform you that your MzansiServe account has been temporarily suspended.

Reason: {suspension_reason}

If you believe this was done in error, please contact us:
{support_email}

Sincerely,
MzansiServe Compliance Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>We regret to inform you that your MzansiServe account has been temporarily suspended.</p>
<p><strong>Reason:</strong> {suspension_reason}</p>
<p>If you believe this was done in error, please contact us:<br><a href="mailto:{support_email}">{support_email}</a></p>
<p>Sincerely,<br>MzansiServe Compliance Team</p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'user_suspension', 'user_id': str(user.id)}
        )
        EmailService.send_email(email_id=email.id)
        return email
