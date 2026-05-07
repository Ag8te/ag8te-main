"""
Earnings reconciliation: month-end transfer of earnings to wallet.
Earnings are calculated month-to-date; at month-end (or when recon runs for a past month)
we credit the earner's wallet and record in EarningsRecon so we don't double-credit.
"""
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import and_, func, or_
from backend.extensions import db
from backend.models import User, ServiceRequest, AppSetting, EarningsRecon
from backend.services.wallet_service import WalletService


def _earner_roles():
    return ('driver', 'professional', 'service-provider')


def _request_type_for_role(role):
    if role == 'driver':
        return 'cab'
    if role == 'professional':
        return 'professional'
    if role == 'service-provider':
        return 'provider'
    return None


def _admin_fee_rate_for_role(role):
    key = 'driver_admin_fee_rate' if role == 'driver' else (
        'professional_admin_fee_rate' if role == 'professional' else 'driver_admin_fee_rate'
    )
    setting = AppSetting.query.get(key)
    return float(setting.value) if setting else 0.10


def _earnings_for_user_month(user_id, role, period_yyyy_mm):
    """Sum completed earnings for user in the given month (updated_at in month)."""
    request_type = _request_type_for_role(role)
    if not request_type:
        return Decimal('0')
    start = datetime.strptime(period_yyyy_mm + '-01', '%Y-%m-%d').replace(tzinfo=timezone.utc)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1)
    else:
        end = start.replace(month=start.month + 1, day=1)
    row = db.session.query(func.coalesce(func.sum(ServiceRequest.payment_amount), 0)).filter(
        ServiceRequest.request_type == request_type,
        ServiceRequest.provider_id == user_id,
        ServiceRequest.status == 'completed',
        ServiceRequest.updated_at >= start,
        ServiceRequest.updated_at < end,
        or_(
            ServiceRequest.details['wallet_credited'].astext != 'true',
            ServiceRequest.details['wallet_credited'].is_(None)
        )
    ).first()
    gross = float(row[0]) if row and row[0] else 0.0
    rate = _admin_fee_rate_for_role(role)
    return Decimal(str(gross * (1.0 - rate)))


def run_recon_for_user(user_id, period_yyyy_mm=None):
    """
    For the given user (if earner), run recon for completed months not yet transferred.
    If period_yyyy_mm is given, run only for that month (used by admin manual trigger).
    Returns list of { period_month, earnings_amount, transferred }.
    """
    user = User.query.get(user_id)
    if not user or user.role not in _earner_roles():
        return []
    role = user.role
    now = datetime.now(timezone.utc)
    results = []

    if period_yyyy_mm:
        months_to_process = [period_yyyy_mm]
    else:
        # All completed months (before current month)
        months_to_process = []
        y, m = now.year, now.month
        for _ in range(24):  # max 2 years back
            m -= 1
            if m < 1:
                m += 12
                y -= 1
            months_to_process.append(f'{y:04d}-{m:02d}')

    for period_month in months_to_process:
        if EarningsRecon.query.filter_by(user_id=user_id, period_month=period_month).first():
            continue
        amount = _earnings_for_user_month(user_id, role, period_month)
        if amount <= 0:
            continue
        wallet = WalletService.get_or_create_wallet(user_id)
        WalletService.add_transaction(
            wallet_id=wallet.id,
            user_id=user_id,
            transaction_type='earnings_transfer',
            amount=float(amount),
            currency=wallet.currency or 'ZAR',
            external_id=None,
            description=f'Earnings transfer {period_month}',
            metadata={'period_month': period_month, 'role': role},
        )
        transferred_at = datetime.now(timezone.utc)
        recon = EarningsRecon(
            user_id=user_id,
            period_month=period_month,
            role=role,
            earnings_amount=amount,
            transferred_at=transferred_at,
        )
        db.session.add(recon)
        db.session.commit()
        results.append({'period_month': period_month, 'earnings_amount': float(amount), 'transferred': True})
    return results


def run_recon_for_all_earners(period_yyyy_mm):
    """Admin: run recon for all earner users for the given month."""
    earner_ids = db.session.query(User.id).filter(User.role.in_(_earner_roles())).all()
    earner_ids = [r[0] for r in earner_ids]
    results = []
    for uid in earner_ids:
        try:
            r = run_recon_for_user(uid, period_yyyy_mm=period_yyyy_mm)
            results.extend([dict(user_id=str(uid), **x) for x in r])
        except Exception:
            db.session.rollback()
            raise
    return results
