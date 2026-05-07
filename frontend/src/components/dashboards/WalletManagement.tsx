import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    InputAdornment,
    Divider,
    alpha,
    useTheme,
    Grid,
    Avatar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from "@mui/material";
import {
    AccountBalanceWallet as WalletIcon,
    NorthEast as ArrowUpIcon,
    SouthWest as ArrowDownIcon,
    History as HistoryIcon,
    FileDownload as DownloadIcon,
    InfoOutlined as InfoIcon
} from "@mui/icons-material";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

// Added SA bank list with branch codes
const SA_BANKS: { name: string; branch_code: string }[] = [
    { name: "ABSA",           branch_code: "632005" },
    { name: "African Bank",   branch_code: "430000" },
    { name: "Bidvest Bank",   branch_code: "462005" },
    { name: "Capitec",        branch_code: "470010" },
    { name: "Discovery Bank", branch_code: "679000" },
    { name: "FNB",            branch_code: "250655" },
    { name: "Investec",       branch_code: "580105" },
    { name: "Nedbank",        branch_code: "198765" },
    { name: "Standard Bank",  branch_code: "051001" },
    { name: "TymeBank",       branch_code: "678910" },
];

interface Transaction {
    id: string;
    transaction_type: 'top-up' | 'payment' | 'withdrawal' |    'refund' | 'cancellation_refund' | 'earnings_transfer' | 'withdrawal_reversal';
    amount: number;
    currency: string;
    balance_before: number;
    balance_after: number;
    created_at: string;
    description: string;
    external_id: string 
}

interface WalletManagementProps {
    balance: number;
    transactions: Transaction[];
    role: 'driver' | 'professional' | 'service-provider';
    onWithdrawalRequested: () => void;
}

export const WalletManagement = ({ balance, transactions, role, onWithdrawalRequested }: WalletManagementProps) => {
    const { toast } = useToast();
    const theme = useTheme();
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [bankingDetails, setBankingDetails] = useState({
        bank_name: '',
        account_holder: '',
        account_number: '',
        branch_code: ''
    });
    const [bankingLoaded, setBankingLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchBankingDetails = async () => {
            try {
                const res = await apiFetch('/api/profile');
                if (res.success && res.data?.profile_data?.banking_details) {
                   // pre-fill from saved profile if they exist
                   setBankingDetails(res.data.profile_data.banking_details);
                }

            } catch (_err) {
                // Banking details are optional; ignore profile fetch errors
            }
            setBankingLoaded(true);
        };
        fetchBankingDetails();
    }, []);

    // Bank selection handler auto-fills branch code
    const handleBankSelect = (bankName: string) => {
        const bank = SA_BANKS.find(b => b.name === bankName);
        setBankingDetails(prev => ({
            ...prev,
            bank_name: bankName,
            branch_code: bank ? bank.branch_code : ''
        }));
        setValidationErrors(prev => ({
            ...prev,
            bank_name: '', branch_code: ''}));
    };

    const handleWithdrawalRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawalAmount);

        if (isNaN(amount) || amount < 200) {
            toast({ title: "Invalid amount", description: "You can only withdraw amounts of R200 or more.", variant: "destructive" });
            return;
        }

        if (amount > balance) {
            toast({ title: "Insufficient balance", description: `Your current balance is R${balance.toFixed(2)}.`, variant: "destructive" });
            return;
        }

        // Validate banking details before submitting
        const { bank_name, account_holder, account_number, branch_code } = bankingDetails;
        const errors: Record<string, string> = {};
        
        if (!bank_name.trim()) {
            errors.bank_name = "Please select your bank.";
        }
        if (!account_holder.trim()) {
            errors.account_holder = "Account holder name is required.";
        }else if (account_holder.trim().split(' ').filter(Boolean).length < 2) {
            errors.account_holder = "Please enter your name as it appears on your bank account.";
        }
        if (!account_number.trim()) {
            errors.account_number = "Account number is required.";
        }else if (!/^\d{8,11}$/.test(account_number.trim())) {
            errors.account_number = "Account number must be 8-11 digits.";
        }
        if (!branch_code.trim()) {
            errors.branch_code = "Branch code is required.";
        } else if (!/^\d{6}$/.test(branch_code.trim())) {
            errors.branch_code = "Branch code must be 6 digits.";
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            toast({ title: "Validation Error", description: "Please fix the banking details errors before submitting.", variant: "destructive" });
            return;
        }
        setValidationErrors({});

        setIsSubmitting(true);
        try {
            await apiFetch('/api/profile/banking-details', {
                method: 'PATCH',
                data: { banking_details: bankingDetails }
            });

            const res = await apiFetch('/api/dashboard/wallet/withdrawal-request', {
                method: 'POST',
                data: { amount, banking_details: bankingDetails }
            });

            if (res.success) {
                toast({ title: "Request Submitted", description: `Your withdrawal request for R${amount.toFixed(2)} is being processed.` });
                setWithdrawalAmount("");
                onWithdrawalRequested();
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message: "Failed to submit request";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }

    };

    return (
        <Grid container spacing={3}>
            {/* Wallet Summary & Withdrawal Form */}
            <Grid size={{ xs: 12, lg: 4 }}>
                <Stack spacing={3}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 4,
                            borderRadius: 3,
                            borderColor: alpha(theme.palette.divider, 0.08),
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, #ffffff 100%)`,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <Box sx={{ position: 'absolute', right: -40, bottom: -40, width: 160, height: 160, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: '50%' }} />

                        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', color: 'white', width: 48, height: 48, borderRadius: 2 }}>
                                <WalletIcon />
                            </Avatar>

                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.1em' }}>
                                    Available Balance
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 900, mt: 0.5 }}>
                                    R {balance.toFixed(2)}
                                </Typography>
                            </Box>

                            <Divider sx={{ borderStyle: 'dashed' }} />

                            <form onSubmit={handleWithdrawalRequest}>
                                <Stack spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="Withdrawal Amount"
                                        type="number"
                                        size="small"
                                        placeholder="0.00"
                                        value={withdrawalAmount}
                                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: <InputAdornment position="start"><Typography sx={{ fontWeight: 700 }}>R</Typography></InputAdornment>,
                                                sx: { fontWeight: 800, bgcolor: 'background.paper' }
                                            }
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', pt: 1 }}>
                                        Banking Details
                                    </Typography>
                                    <FormControl fullWidth size="small" error={!!validationErrors.bank_name}>
                                        <InputLabel>Bank Name</InputLabel>
                                        <Select 
                                        value={bankingDetails.bank_name}
                                            label="Bank Name"
                                            onChange={(e) => handleBankSelect(e.target.value)}
                                            sx={{ bgcolor: 'background.paper' }}
                                        >
                                            {SA_BANKS.map((bank) => (
                                                <MenuItem key={bank.name} value={bank.name}>
                                                    {bank.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {validationErrors.bank_name && (
                                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5}}>
                                                {validationErrors.bank_name}
                                            </Typography>
                                        )}
                                    </FormControl>
                                    <TextField
                                        fullWidth
                                        label="Account Holder Name"
                                        size="small"
                                        placeholder="Full name as on your bank account"
                                        value={bankingDetails.account_holder}
                                        onChange={(e) => {setBankingDetails(prev => ({
                                            ...prev, account_holder: e.target.value }));
                                        setValidationErrors(prev => ({
                                            ...prev, account_holder: ''
                                        }));
                                        }}
                                        error={!!validationErrors.account_holder}
                                        helperText={validationErrors.account_holder}
                                        slotProps={{ input: { sx: { bgcolor: 'background.paper' } } }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Account Number"
                                        size="small"
                                        placeholder="8 to 11 digits"
                                        value={bankingDetails.account_number}
                                        onChange={(e) => {const val = e.target.value.replace(/\D/g, '');setBankingDetails(prev => ({ 
                                            ...prev, account_number: val 
                                        }));
                                        setValidationErrors(prev => ({
                                            ...prev, account_number: ''
                                        }));
                                        }}
                                        error={!!validationErrors.account_number}
                                        helperText={validationErrors.account_number || `${bankingDetails.account_number.length} digits entered`}
                                        inputProps={{ maxLength: 11 }}
                                    
                                        slotProps={{ input: { sx: { bgcolor: 'background.paper' } } }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Branch Code"
                                        size="small"
                                        value={bankingDetails.branch_code}
                                        onChange={(e) => {

                                           const val = e.target.value.replace(/\D/g, '');
                                           setBankingDetails(prev => ({ 
                                            ...prev, branch_code: val 
                                        }));
                                        setValidationErrors(prev => ({
                                            ...prev, branch_code: ''
                                        }));
                                        }}
                                        error={!!validationErrors.branch_code}
                                        helperText={validationErrors.branch_code || (bankingDetails.bank_name ? 'Auto-filled from selected bank' : 'Select a bank to auto-fill')
                                        }
                                        inputProps={{ maxLength: 6 }}
                                        slotProps={{ input: { sx: { bgcolor: bankingDetails.bank_name ? alpha('#4caf50' , 0.05) : 'background.paper', color: bankingDetails.bank_name ? 'success.dark' : 'text.primary' },
                                    readOnly: !!bankingDetails.bank_name } }}
                                    />

                                    {bankingLoaded && bankingDetails.bank_name && (
                                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600}}>
                                            Banking details loaded from your profile. Update if needed.
                                        </Typography>
                                    )}
                                    <Button
                                        fullWidth
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        disabled={isSubmitting || balance <= 0}
                                        sx={{
                                            fontWeight: 800,
                                            borderRadius: 2,
                                            py: 1.2,
                                            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                                        }}
                                    >
                                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Request Payout"}
                                    </Button>
                                </Stack>
                            </form>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#121926', color: 'white' }}>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                            <InfoIcon sx={{ color: 'primary.main' }} />
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Payout Processing</Typography>
                                <Typography variant="caption" sx={{ color: alpha('#fff', 0.7), lineHeight: 1.5 }}>
                                    Requests are verified and settled within 24-48 business hours. Standard bank rates apply to all outgoing transfers.
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Stack>
            </Grid>

            {/* Transaction History */}
            <Grid size={{ xs: 12, lg: 8 }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(theme.palette.divider, 0.08), height: '100%' }}>
                    <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.08) }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha(theme.palette.action.hover, 0.04), color: 'text.secondary', width: 36, height: 36 }}>
                                <HistoryIcon fontSize="small" />
                            </Avatar>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Transaction Registry</Typography>
                        </Stack>
                        <Button size="small" startIcon={<DownloadIcon />} sx={{ fontWeight: 700 }}>Export</Button>
                    </Box>

                    <TableContainer>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Details</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Date</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Amount</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Balance After</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions.length > 0 ? (
                                    transactions.map((tx) => {
                                        const isCredit = [
                                            'top-up',
                                            'refund',
                                            'cancellation_refund',
                                            'earnings_transfer',
                                            'withdrawal_reversal'
                                        ].includes(tx.transaction_type);
                                        return (
                                            <TableRow key={tx.id} hover>
                                                <TableCell>
                                                    <Avatar
                                                        sx={{
                                                            width: 32,
                                                            height: 32,
                                                            bgcolor: isCredit ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                                                            color: isCredit ? 'success.main' : 'error.main'
                                                        }}
                                                    >
                                                        {isCredit ? <ArrowDownIcon sx={{ fontSize: 16 }} /> : <ArrowUpIcon sx={{ fontSize: 16 }} />}
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                                        {{
                                                            'top-up': 'Wallet Top-up',
                                                            'payment': 'Service Payment',
                                                            'withdrawal': 'Payout Request',
                                                            'refund': 'Refund',
                                                            'cancellation_refund': 'Cancellation Refund',
                                                            'earnings_transfer': 'Earnings Transfer',
                                                            'withdrawal_reversal': 'Payout Reversed'
                                                        }[tx.transaction_type] || tx.transaction_type.replace(/_/g, ' ')}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                                                        {tx.description || `REF: ${tx.id.slice(-8).toUpperCase()}`}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: isCredit ? 'success.main' : 'error.main' }}>
                                                        {isCredit ? '+' : '-'} R {Number(tx.amount).toFixed(2)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={`R${tx.balance_after?.toFixed(2) || '-'}`}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.6rem',
                                                            fontWeight: 800,
                                                            borderRadius: 1,
                                                            bgcolor: alpha(theme.palette.info.main, 0.08),
                                                            color: 'info.dark'
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>No financial activity recorded.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Grid>
        </Grid>
    );
};

export default WalletManagement;
