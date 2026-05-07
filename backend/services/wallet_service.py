"""
Wallet Service
"""
from decimal import Decimal
from datetime import datetime
from backend.models import Wallet, WalletTransaction, User
from backend.extensions import db

class WalletService:
    """Service for wallet operations"""
    
    @staticmethod
    def get_or_create_wallet(user_id):
        """Get or create wallet for user"""
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            wallet = Wallet(user_id=user_id)
            db.session.add(wallet)
            db.session.commit()
        return wallet
    
    @staticmethod
    def add_transaction(wallet_id, user_id, transaction_type, amount, currency='ZAR', external_id=None, description=None, metadata=None):
        """
        Add a wallet transaction and update balance
        
        Args:
            wallet_id: Wallet ID
            user_id: User ID
            transaction_type: 'top-up', 'payment', 'refund', 'cancellation_refund', 'withdrawal'
            amount: Transaction amount (positive for credits, negative for debits)
            currency: Currency code
            external_id: External ID (payment, order, or request ID)
            description: Transaction description
            metadata: Additional metadata
        
        Returns:
            WalletTransaction: Created transaction
        """
        wallet = Wallet.query.filter_by(id=wallet_id).with_for_update().first()
        if not wallet:
            raise ValueError(f"Wallet {wallet_id} not found")
        
        balance_before = float(wallet.balance) if wallet.balance else 0.0
        
        # Convert amount to Decimal for consistency with wallet.balance (Numeric type)
        amount_decimal = Decimal(str(amount))
        
        # Update balance
        if transaction_type in ('top-up', 'refund', 'cancellation_refund', 'earnings_transfer', 'withdrawal_reversal'):
            wallet.balance += amount_decimal
        elif transaction_type in ('payment', 'withdrawal'):
            wallet.balance -= amount_decimal
            if wallet.balance < 0:
                raise ValueError("Insufficient wallet balance")
        else:
            raise ValueError(f"Invalid transaction type: {transaction_type}")
        
        balance_after = float(wallet.balance) if wallet.balance else 0.0
        
        # Create transaction record
        transaction = WalletTransaction(
            wallet_id=wallet_id,
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            currency=currency,
            balance_before=balance_before,
            balance_after=balance_after,
            external_id=external_id,
            description=description,
            meta_data=metadata or {}
        )
        
        db.session.add(transaction)
        wallet.updated_at = datetime.utcnow()
        db.session.commit()
        
        return transaction
    
    @staticmethod
    def check_sufficient_funds(user_id, amount):
        """Check if user has sufficient wallet balance"""
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            return False
        return float(wallet.balance) >= float(amount)

