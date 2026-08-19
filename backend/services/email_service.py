"""
Email Service
"""
import os
import smtplib
import requests
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
            from_name = current_app.config.get('DEFAULT_FROM_NAME') or 'AG8TE'
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
    def send_brevo_email(recipient, subject, body, body_html=None):
        """Send a transactional email through Brevo's HTTP API."""
        api_key = current_app.config.get('BREVO_API_KEY')
        if not api_key:
            return False

        sender_email = current_app.config.get('BREVO_SENDER_EMAIL') or current_app.config.get('DEFAULT_FROM_EMAIL')
        sender_name = current_app.config.get('BREVO_SENDER_NAME') or current_app.config.get('DEFAULT_FROM_NAME') or 'AG8TE'
        api_url = current_app.config.get('BREVO_API_URL') or 'https://api.brevo.com/v3'

        response = requests.post(
            f"{api_url.rstrip('/')}/smtp/email",
            headers={
                'accept': 'application/json',
                'api-key': api_key,
                'content-type': 'application/json',
            },
            json={
                'sender': {'name': sender_name, 'email': sender_email},
                'to': [{'email': recipient}],
                'subject': subject,
                'textContent': body,
                'htmlContent': body_html or body.replace('\n', '<br>'),
            },
            timeout=15,
        )
        response.raise_for_status()
        return True

    @staticmethod
    def send_otp_email(user, code, purpose='login'):
        """Send an email OTP, preferring Brevo and falling back to the local mail queue."""
        first_name = _first_name(user)
        purpose_label = {
            'login': 'login',
            'payment_verification': 'payment verification',
            'password_reset': 'password reset',
            'payout': 'payout confirmation',
        }.get(purpose, 'verification')
        subject = f"Your AG8TE verification code: {code}"
        body = f"""Hi {first_name},

Your AG8TE {purpose_label} code is: {code}

This code expires shortly. If you did not request it, you can ignore this email.

Regards,
AG8TE Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<p>Hi {first_name},</p>
<p>Your AG8TE {purpose_label} code is:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">{code}</p>
<p>This code expires shortly. If you did not request it, you can ignore this email.</p>
<p>Regards,<br>AG8TE Team</p>
</body></html>"""

        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'otp', 'purpose': purpose, 'user_id': str(user.id)}
        )

        try:
            sent = EmailService.send_brevo_email(user.email, subject, body, body_html=body_html)
            if sent:
                email.status = 'sent'
                email.sent_at = datetime.utcnow()
                db.session.commit()
                return email
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Brevo OTP email failed, falling back to SMTP queue: %s", e)

        sent = EmailService.send_email(email_id=email.id)
        if not sent:
            raise RuntimeError("OTP email delivery failed")
        return email
    
    @staticmethod
    def send_verification_email(user, token):
        """Send email verification email"""
        frontend_url = get_public_frontend_base_url()
        verification_url = f"{frontend_url}/verify-email?token={token}"
        first_name = _first_name(user)
        subject = "Verify Your Email Address - Welcome to AG8TE"
        body = f"""Hi {first_name},

Welcome to AG8TE 

To complete your registration, please verify your email address by clicking the button below:

Verify My Email: {verification_url}

If you did not create this account, you can safely ignore this email.

Thank you for joining South Africa's trusted marketplace for services, professionals, drivers, and shops.

Warm regards,
AG8TE Support Team
www.ag8te.com"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Welcome to AG8TE</p>
<p>To complete your registration, please verify your email address by clicking the button below:</p>
<p><a href="{verification_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Verify My Email</a></p>
<p>If you did not create this account, you can safely ignore this email.</p>
<p>Thank you for joining South Africa's trusted marketplace for services, professionals, drivers, and shops.</p>
<p>Warm regards,<br>AG8TE Support Team<br><a href="https://www.ag8te.com">www.ag8te.com</a></p>
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
    def send_client_registration_verification(user, token):
        """Send the email-verification link for a completed client registration."""
        frontend_url = get_public_frontend_base_url()
        confirmation_url = f"{frontend_url}/verify-email?token={token}"
        first_name = _first_name(user)
        subject = "Confirm Your AG8TE Registration"
        body = f"""Hi {first_name},

Welcome to AG8TE.

Please confirm your registration by clicking the link below. After confirmation, you can sign in to your client account.

Confirm Registration: {confirmation_url}

Your registration information was submitted successfully.

Kind regards,
AG8TE Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: left;">
<p>Hi {first_name},</p>
<p>Welcome to AG8TE.</p>
<p>Please confirm your registration by clicking the button below. After confirmation, you can sign in to your client account.</p>
<p><a href="{confirmation_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Confirm Registration</a></p>
<p>Your registration information was submitted successfully.</p>
<p>Kind regards,<br>AG8TE Team</p>
</body></html>"""
        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'client_registration_confirmation', 'user_id': str(user.id)}
        )
        EmailService.send_email(email_id=email.id)
        return email

    @staticmethod
    def send_password_reset_email(user, token):
        """Send password reset email"""
        frontend_url = get_public_frontend_base_url()
        reset_url = f"{frontend_url}/reset-password?token={token}"
        
        first_name = _first_name(user)
        subject = "Reset Your Password - AG8TE"
        body = f"Hi {first_name},\n\nReset your password by clicking the link: {reset_url}"
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: center;">
<p>Hi {first_name},</p>
<p>You requested to reset your password. Click the button below to set a new password:</p>
<p><a href="{reset_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Reset My Password</a></p>
<p>If you did not request this, you can safely ignore this email.</p>
<p>Warm regards,<br>AG8TE Team</p>
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
        """Confirm registration with accurate next steps for the account role."""
        first_name = _first_name(user)
        frontend_url = get_public_frontend_base_url()
        login_url = f"{frontend_url}/login"
        is_client = user.role == 'client'
        account_type = (user.role or 'user').replace('-', ' ')

        if is_client:
            subject = "Registration Successful - Welcome to AG8TE!"
            body = f"""Hi {first_name},

Great news! Your registration on AG8TE was successful 

Your account is now active, and you can start exploring:
- Local professionals & service providers
- Driver bookings
- Online shopping
- Secure payments

Login anytime here: {login_url} or directly from the AG8TE mobile app, www.ag8te.com or www.ag8te.co.za

Thank you for choosing AG8TE - made for South Africa, built for you

Kind regards,
AG8TE Team"""
            body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: left;">
<p>Hi {first_name},</p>
<p>Great news! Your registration on AG8TE was successful</p>
<p>Your account is now active, and you can start exploring:</p>
<ul>
    <li>Local professionals & service providers</li>
    <li>Driver bookings</li>
    <li>Online shopping</li>
    <li>Secure payments</li>
</ul>
<p>Login anytime here: <a href="{login_url}">{login_url}</a> or directly from the AG8TE mobile app, <a href="https://www.ag8te.com">www.ag8te.com</a> or <a href="https://www.ag8te.co.za">www.ag8te.co.za</a></p>
<p>Thank you for choosing AG8TE - made for South Africa, built for you</p>
<p>Kind regards,<br>AG8TE Team</p>
</body></html>"""
        else:
            subject = "Registration Received - Next Steps for AG8TE"
            body = f"""Hi {first_name},

We have received your AG8TE {account_type} registration.

Your registration fee is currently free. Your account is not active yet because our administrator still needs to review your application. You will receive another email when the review is complete.

To continue, log in here: {login_url}

Kind regards,
AG8TE Team"""
            body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: left;">
<p>Hi {first_name},</p>
<p>We have received your AG8TE <strong>{account_type}</strong> registration.</p>
<p>Your registration fee is currently free. Your account is not active yet because our administrator still needs to review your application. You will receive another email when the review is complete.</p>
<p><a href="{login_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">View Account</a></p>
<p>Kind regards,<br>AG8TE Team</p>
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
            subject = "Registration Completed - Welcome to AG8TE"
            body = f"""Hi {first_name},

Thank you. Your registration has been completed successfully.

Amount Paid: R{payment_amount:.2f}
Date: {payment_date}
Reference: {reference}

Your account is active and ready to use.

Regards,
AG8TE Billing Team
billing@ag8te.com"""
            body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Thank you. Your registration has been completed successfully.</p>
<p><strong>Amount Paid:</strong> R{payment_amount:.2f}<br>
<strong>Date:</strong> {payment_date}<br>
<strong>Reference:</strong> {reference}</p>
<p>Your account is active and ready to use.</p>
<p>Regards,<br>AG8TE Billing Team<br><a href="mailto:billing@ag8te.com">billing@ag8te.com</a></p>
</body></html>"""
        else:
            account_type = (user.role or 'member').replace('-', ' ').title()
            subject = "Registration Payment Received - Pending Admin Approval"
            body = f"""Hi {first_name},

Thank you. We have received your registration payment and created your AG8TE {account_type} account.

Amount Paid: R{payment_amount:.2f}
Date: {payment_date}
Reference: {reference}
Current Status: Pending admin approval

Your registration is now awaiting review by the system administrator. You will receive another email as soon as your account has been approved.

Regards,
AG8TE Billing Team
billing@ag8te.com"""
            body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Thank you. We have received your registration payment and created your AG8TE <strong>{account_type}</strong> account.</p>
<p><strong>Amount Paid:</strong> R{payment_amount:.2f}<br>
<strong>Date:</strong> {payment_date}<br>
<strong>Reference:</strong> {reference}<br>
<strong>Current Status:</strong> Pending admin approval</p>
<p>Your registration is now awaiting review by the system administrator. You will receive another email as soon as your account has been approved.</p>
<p>Regards,<br>AG8TE Billing Team<br><a href="mailto:billing@ag8te.com">billing@ag8te.com</a></p>
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

        subject = "Complete Your Registration Payment to Activate AG8TE"
        body = f"""Hi {first_name},

Your AG8TE {account_type} account is almost ready, but your registration fee is still outstanding.

Registration Fee Due: R{payment_amount:.2f}
Reference: {reference}

Please log in to your account and complete the registration payment so our admin team can continue with your approval and activate your access to the system.

Login here: {login_url}

Once payment is received, your account can move forward for approval.

Warm regards,
AG8TE Billing Team
billing@ag8te.com"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: left;">
<p>Hi {first_name},</p>
<p>Your AG8TE <strong>{account_type}</strong> account is almost ready, but your registration fee is still outstanding.</p>
<p><strong>Registration Fee Due:</strong> R{payment_amount:.2f}<br>
<strong>Reference:</strong> {reference}</p>
<p>Please log in to your account and complete the registration payment so our admin team can continue with your approval and activate your access to the system.</p>
<p><a href="{login_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Login to Complete Payment</a></p>
<p>Once payment is received, your account can move forward for approval.</p>
<p>Warm regards,<br>AG8TE Billing Team<br><a href="mailto:billing@ag8te.com">billing@ag8te.com</a></p>
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
        subject = "Order Confirmed - Thank You for Shopping with AG8TE"
        body = f"""Hi {first_name},

Thank you for your purchase on AG8TE Shop

Order Number: {order.id}
Total Amount: R{float(order.total):.2f}
Delivery Address: {delivery_address}
Order Date: {order_date}

You will receive another update once your order is dispatched.

Warm regards,
AG8TE Shop Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Thank you for your purchase on AG8TE Shop</p>
<p><strong>Order Number:</strong> {order.id}<br>
<strong>Total Amount:</strong> R{float(order.total):.2f}<br>
<strong>Delivery Address:</strong> {delivery_address}<br>
<strong>Order Date:</strong> {order_date}</p>
<p>You will receive another update once your order is dispatched.</p>
<p>Warm regards,<br>AG8TE Shop Team</p>
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
AG8TE Support Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Your call-out payment has been successfully processed</p>
<p><strong>Service Provider:</strong> {provider_name}<br>
<strong>Service Requested:</strong> {service_name}<br>
<strong>Call-Out Fee Paid:</strong> R{payment_amount:.2f}<br>
<strong>Booking Date:</strong> {booking_date}</p>
<p>The provider will contact you shortly.</p>
<p>Regards,<br>AG8TE Support Team</p>
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
    def send_request_accepted_email(user, service_request):
        """Notify the requester that their service request has been accepted."""
        if not user or not service_request:
            return None

        first_name = _first_name(user)
        provider = getattr(service_request, 'provider', None)
        provider_name = 'Service Provider'
        if provider:
            provider_name = (
                (provider.data or {}).get('full_name')
                or getattr(provider, 'name', None)
                or getattr(provider, 'email', None)
                or provider_name
            )

        service_name = (service_request.request_type or 'service').replace('_', ' ').title()
        booking_date = service_request.scheduled_date or ''
        if service_request.scheduled_time:
            booking_date = f"{booking_date} {service_request.scheduled_time}".strip()
        booking_date = booking_date or 'To be confirmed'

        subject = "Your Booking Has Been Accepted - AG8TE"
        body = f"""Hi {first_name},

Good news. Your booking has been accepted.

Service: {service_name}
Accepted By: {provider_name}
Scheduled For: {booking_date}
Request Reference: {service_request.id}

You can log in to AG8TE to view the booking details and next steps.

Regards,
AG8TE Support Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: left;">
<p>Hi {first_name},</p>
<p>Good news. Your booking has been accepted.</p>
<p><strong>Service:</strong> {service_name}<br>
<strong>Accepted By:</strong> {provider_name}<br>
<strong>Scheduled For:</strong> {booking_date}<br>
<strong>Request Reference:</strong> {service_request.id}</p>
<p>You can log in to AG8TE to view the booking details and next steps.</p>
<p>Regards,<br>AG8TE Support Team</p>
</body></html>"""

        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={'type': 'request_accepted', 'user_id': str(user.id), 'request_id': service_request.id}
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

Your account verification is now complete, and you can enjoy full access to all AG8TE services.

Thank you for your patience.

Best regards,
AG8TE Team
            """.strip()
            
            body_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>ID Verification Successful</h2>
                <p>Dear {user_name},</p>
                <p>Great news! Your ID document has been verified.</p>
                <p>Your account verification is now complete, and you can enjoy full access to all AG8TE services.</p>
                <p>Thank you for your patience.</p>
                <p>Best regards,<br>AG8TE Team</p>
            </body>
            </html>
            """
            subject = "ID Verification Successful - AG8TE"
        else:  # rejected
            body = f"""
Dear {user_name},

We regret to inform you that your ID document verification was not successful.

Reason: {reason or 'Not specified'}

Please upload a new, clear ID document through your profile page for re-verification.

If you have any questions, please contact our support team.

Best regards,
AG8TE Team
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
                <p>Best regards,<br>AG8TE Team</p>
            </body>
            </html>
            """
            subject = "ID Verification Update - AG8TE"
        
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
        subject = "Account Approved - Welcome to AG8TE!"
        body = f"""Hi {first_name},

Congratulations

Your account has been successfully reviewed and approved!

You are now authorised as a: {account_type}

Access your dashboard here: {dashboard_url}

Warm regards,
AG8TE Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>Congratulations</p>
<p>Your account has been successfully reviewed and approved!</p>
<p>You are now authorised as a: <strong>{account_type}</strong></p>
<p>Access your dashboard here: <a href="{dashboard_url}">{dashboard_url}</a></p>
<p>Warm regards,<br>AG8TE Team</p>
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
        support_email = current_app.config.get('SUPPORT_EMAIL') or 'support@ag8te.com'
        subject = "Account Suspended - Important Notice"
        body = f"""Hi {first_name},

We regret to inform you that your AG8TE account has been temporarily suspended.

Reason: {suspension_reason}

If you believe this was done in error, please contact us:
{support_email}

Sincerely,
AG8TE Compliance Team"""
        body_html = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333 text-align: left;">
<p>Hi {first_name},</p>
<p>We regret to inform you that your AG8TE account has been temporarily suspended.</p>
<p><strong>Reason:</strong> {suspension_reason}</p>
<p>If you believe this was done in error, please contact us:<br><a href="mailto:{support_email}">{support_email}</a></p>
<p>Sincerely,<br>AG8TE Compliance Team</p>
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

    @staticmethod
    def send_user_registration_rejection_notification(user, reason):
        """Send registration rejection email to a provider/driver/professional.

        Called by AdminService.reject_user(). reason is already validated
        (non-empty) before this is called.
        """
        first_name = _first_name(user)
        account_type = (user.role or 'member').replace('-', ' ').title()
        support_email = current_app.config.get('SUPPORT_EMAIL') or 'support@ag8te.com'
        frontend_url = get_public_frontend_base_url()
        dashboard_url = f"{frontend_url}/dashboard"

        subject = "Application Update, Action Required | AG8TE"

        body = f"""Hi {first_name},

Thank you for applying to join AG8TE as a {account_type}.

After reviewing your application, we were unfortunately unable to approve it at this time.

Reason: {reason}

What to do next:
1. Log in to your dashboard: {dashboard_url}
2. Go to your Documents tab and re-upload the flagged documents.
3. Once updated, your application will be re-queued for review.

If you have any questions or need assistance, please contact us:
{support_email}

We look forward to welcoming you on the platform once the documents are in order.

Warm regards,
AG8TE Compliance Team"""

        body_html = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: left;">
  <h2 style="color: #c0392b;">Application Update, Action Required</h2>
  <p>Hi {first_name},</p>
  <p>Thank you for applying to join AG8TE as a <strong>{account_type}</strong>.</p>
  <p>After reviewing your application, we were unfortunately unable to approve it at this time.</p>
  <p><strong>Reason:</strong><br>
     <span style="background:#fff3f3; border-left:4px solid #c0392b; padding:8px 12px; display:block; margin-top:6px;">{reason}</span>
  </p>
  <h3>What to do next</h3>
  <ol>
    <li><a href="{dashboard_url}">Log in to your dashboard</a></li>
    <li>Go to your <strong>Documents</strong> tab and re-upload the flagged documents.</li>
    <li>Once updated, your application will be re-queued for review.</li>
  </ol>
  <p>If you have any questions or need assistance, please contact us:<br>
     <a href="mailto:{support_email}">{support_email}</a>
  </p>
  <p>We look forward to welcoming you on the platform once the documents are in order.</p>
  <p>Warm regards,<br>AG8TE Compliance Team</p>
</body>
</html>"""

        email = EmailService.queue_email(
            recipient=user.email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={
                'type': 'user_registration_rejection',
                'user_id': str(user.id),
            }
        )
        EmailService.send_email(email_id=email.id)
        return email

    # ───────────────────────────────────────────
    # NEW: Panic alert notifications
    # ─────────────────────────────────────────────

    @staticmethod
    def send_panic_admin_notification(alert) -> bool:
        """
        Urgent panic alert email to the platform admin.
        Called immediately when a panic is triggered.
        Admin email is read from app config ADMIN_EMAIL or SUPPORT_EMAIL.
        """
        admin_email = (
            current_app.config.get("ADMIN_EMAIL")
            or current_app.config.get("SUPPORT_EMAIL")
            or "support@ag8te.com"
        )
        user = alert.user
        d = user.data or {}
        first = (d.get("full_name") or d.get("first_name") or "").strip()
        last = (d.get("surname") or d.get("last_name") or "").strip()
        if first and not last and " " in first:
            first, last = first.split(" ", 1)
        full_name = f"{first} {last}".strip() or user.email
        role = (user.role or "user").replace("-", " ").title()
        phone = d.get("phone") or "Not provided"
        maps_link = (
            f"https://www.google.com/maps?q={alert.latitude},{alert.longitude}"
            if alert.latitude and alert.longitude else None
        )
        location_html = (
            f"""<p><strong>GPS:</strong> {alert.latitude}, {alert.longitude}<br>
            <a href="{maps_link}" style="color:#dc2626;font-weight:bold;">
            View on Google Maps &rarr;</a></p>"""
            if maps_link else "<p><strong>GPS Location:</strong> Not available from device</p>"
        )
        booking_html = (
            f"<p><strong>Booking ID:</strong> {alert.booking_id}</p>"
            if alert.booking_id else ""
        )
        armed_html = (
            f"<p><strong>Armed Response:</strong> {alert.armed_response_status}</p>"
            if alert.armed_response_status and alert.armed_response_status != "pending_provider"
            else "<p><strong>Armed Response:</strong> No provider configured, manual response required</p>"
        )
        subject = f"PANIC ALERT - {full_name} ({role})"
        body = (
            f"PANIC ALERT\n\nUser: {full_name}\nRole: {role}\nPhone: {phone}\n"
            f"Email: {user.email}\n"
            f"{f'Booking: {alert.booking_id}' if alert.booking_id else ''}\n\n"
            f"GPS: {alert.latitude}, {alert.longitude}\n"
            f"{maps_link or 'Location not available'}\n\n"
            f"Alert ID: {alert.id}\nTime: {alert.created_at}\n\n"
            f"Emergency: Police 10111 | Ambulance 10177 | Emergency 112"
        )
        body_html = f"""
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;">
  <div style="background:#dc2626;padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:26px;">PANIC ALERT</h1>
    <p style="color:#fecaca;margin:6px 0 0;">AG8TE Emergency Notification</p>
  </div>
  <div style="padding:28px;">
    <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h2 style="color:#dc2626;margin:0 0 10px;">Immediate Attention Required</h2>
      <p style="margin:0;color:#7f1d1d;">A user has triggered the panic button. Attempt contact immediately.</p>
    </div>
    <h3 style="border-bottom:2px solid #dc2626;padding-bottom:6px;">User Details</h3>
    <p><strong>Name:</strong> {full_name}</p>
    <p><strong>Role:</strong> {role}</p>
    <p><strong>Phone:</strong> {phone}</p>
    <p><strong>Email:</strong> {user.email}</p>
    {booking_html}
    <h3 style="border-bottom:2px solid #dc2626;padding-bottom:6px;">Location</h3>
    {location_html}
    <h3 style="border-bottom:2px solid #dc2626;padding-bottom:6px;">Alert Info</h3>
    <p><strong>Alert ID:</strong> {alert.id}</p>
    <p><strong>Time:</strong> {alert.created_at}</p>
    {armed_html}
    <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;text-align:center;">
      <p style="margin:0 0 6px;font-weight:bold;">Emergency Numbers</p>
      <p style="margin:0;font-size:16px;">Police: <strong>10111</strong> &nbsp;|&nbsp; Ambulance: <strong>10177</strong> &nbsp;|&nbsp; Emergency: <strong>112</strong></p>
    </div>
  </div>
</div>
</body></html>"""
        email = EmailService.queue_email(
            recipient=admin_email,
            subject=subject,
            body=body,
            body_html=body_html,
            metadata={"type": "panic_admin", "alert_id": str(alert.id), "user_id": str(alert.user_id)},
        )
        return EmailService.send_email(email_id=email.id)

    @staticmethod
    def send_panic_next_of_kin_notification(alert) -> bool:
        """
        Notifies the user's next of kin by email when a panic is triggered.
        Reads next_of_kin from user.data. Returns False if no email on file.
        """
        user = alert.user
        nok = (user.data or {}).get("next_of_kin") or {}
        nok_email = (nok.get("contact_email") or nok.get("email") or "").strip()
        nok_name = (nok.get("full_name") or nok.get("name") or "Emergency Contact").strip()
        if not nok_email:
            return False
        d = user.data or {}
        first = (d.get("full_name") or d.get("first_name") or "").strip()
        last = (d.get("surname") or d.get("last_name") or "").strip()
        if first and not last and " " in first:
            first, last = first.split(" ", 1)
        full_name = f"{first} {last}".strip() or user.email
        phone = d.get("phone") or "Not on file"
        maps_link = (
            f"https://www.google.com/maps?q={alert.latitude},{alert.longitude}"
            if alert.latitude and alert.longitude else None
        )
        location_html = (
            f'<a href="{maps_link}" style="color:#dc2626;font-weight:bold;"> View last known location &rarr;</a>'
            if maps_link else "Location data was not available at the time of the alert."
        )
        subject = f"Emergency Alert - {full_name} needs help"
        body = (
            f"Dear {nok_name},\n\n{full_name} has triggered an emergency panic alert on "
            f"AG8TE. They may be in danger. Please try to contact them urgently.\n\n"
            f"Their phone: {phone}\nLast location: {maps_link or 'Not available'}\n\n"
            f"If you cannot reach them, call: Police 10111 | Emergency 112"
        )
        body_html = f"""
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;">
  <div style="background:#dc2626;padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;"> Emergency Alert</h1>
  </div>
  <div style="padding:28px;">
    <p>Dear {nok_name},</p>
    <p><strong>{full_name}</strong> has triggered an emergency panic alert on AG8TE.
    They may be in danger. Please try to contact them urgently.</p>
    <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 10px;"><strong>!! Last Known Location:</strong></p>
      <p style="margin:0;">{location_html}</p>
    </div>
    <p><strong>Contact them on:</strong> {phone}</p>
    <div style="margin-top:20px;padding:14px;background:#f9fafb;border-radius:8px;">
      <p style="margin:0 0 6px;font-weight:bold;">If you cannot reach them, call:</p>
      <p style="margin:0;font-size:16px;">Police: <strong>10111</strong> &nbsp;|&nbsp; Emergency: <strong>112</strong></p>
    </div>
  </div>
</div>
</body></html>"""
        email = EmailService.queue_email(
            recipient=nok_email, subject=subject, body=body, body_html=body_html,
            metadata={"type": "panic_next_of_kin", "alert_id": str(alert.id), "user_id": str(alert.user_id)},
        )
        return EmailService.send_email(email_id=email.id)
