import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    TextField,
    IconButton,
    InputAdornment,
    Divider,
    alpha,
    useTheme,
    Card,
    CardContent,
    Stack,
    Alert,
    CircularProgress,
    Avatar,
    Autocomplete
} from "@mui/material";
import {
    Add as PlusIcon,
    DeleteOutline as TrashIcon,
    Save as SaveIcon,
    InfoOutlined as InfoIcon,
    BusinessCenter as BriefcaseIcon
} from "@mui/icons-material";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Service {
    name: string;
    description: string;
    hourly_rate?: number;
}

interface ServiceManagementProps {
    initialServices: Service[];
    role: 'professional' | 'service-provider';
}

export const ServiceManagement = ({ initialServices, role }: ServiceManagementProps) => {
    const { toast } = useToast();
    const theme = useTheme();
    const [services, setServices] = useState<Service[]>(initialServices || []);
    const [saving, setSaving] = useState(false);
    const [serviceOptions, setServiceOptions] = useState<any[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await apiFetch(`/api/public/service-options?category=${role}`);
                if (res.success && res.data?.services) {
                    setServiceOptions(res.data.services);
                }
            } catch (err) {
                console.error("Failed to load service options", err);
            }
        };
        fetchOptions();
    }, [role]);

    const addService = () => {
        setServices([...services, { name: "", description: "", hourly_rate: 0 }]);
    };

    const removeService = (index: number) => {
        setServices(services.filter((_, i) => i !== index));
    };

    const updateService = (index: number, field: keyof Service, value: any) => {
        const newServices = [...services];
        newServices[index] = { ...newServices[index], [field]: value };
        setServices(newServices);
    };

    const handleSave = async () => {
        // Validation
        if (services.some(s => !s.name.trim())) {
            toast({ title: "Validation Error", description: "All services must have a name.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const fieldName = role === 'professional' ? 'professional_services' : 'provider_services';
            const res = await apiFetch('/api/profile', {
                method: 'PATCH',
                body: JSON.stringify({
                    [fieldName]: services
                })
            });

            if (res.success) {
                toast({
                    title: "Update Submitted",
                    description: "Your service changes have been submitted for admin approval."
                });
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to submit changes", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(theme.palette.divider, 0.08) }}>
            <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.5), borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.08), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 40, height: 40, borderRadius: 2 }}>
                        <BriefcaseIcon fontSize="small" />
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>My Services</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Manage the offerings you provide to clients.</Typography>
                    </Box>
                </Stack>
                <Button
                    variant="outlined"
                    startIcon={<PlusIcon />}
                    onClick={addService}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                    Add Service
                </Button>
            </Box>

            <Box sx={{ p: 3 }}>
                {services.length > 0 ? (
                    <Stack spacing={3}>
                        {services.map((service, index) => (
                            <Card key={index} variant="outlined" sx={{ borderRadius: 2, position: 'relative', overflow: 'visible' }}>
                                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                    <Box sx={{ position: 'absolute', right: -12, top: -12 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => removeService(index)}
                                            sx={{
                                                bgcolor: 'background.paper',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                color: 'error.main',
                                                '&:hover': { bgcolor: 'error.main', color: 'white' },
                                                zIndex: 1
                                            }}
                                        >
                                            <TrashIcon fontSize="small" />
                                        </IconButton>
                                    </Box>

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: role === 'professional' ? 8 : 12 }}>
                                            <Autocomplete
                                                freeSolo
                                                options={serviceOptions.map((option) => option.name)}
                                                value={service.name}
                                                onChange={(_, newValue) => {
                                                    updateService(index, 'name', newValue || '');
                                                    // Auto-fill description if matched
                                                    const matched = serviceOptions.find(o => o.name === newValue);
                                                    if (matched && matched.description && !service.description) {
                                                        updateService(index, 'description', matched.description);
                                                    }
                                                }}
                                                onInputChange={(_, newInputValue) => {
                                                    updateService(index, 'name', newInputValue);
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        fullWidth
                                                        label="Service Name"
                                                        placeholder="Select or type a custom service..."
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ '& .MuiInputBase-input': { fontWeight: 700 } }}
                                                    />
                                                )}
                                            />
                                        </Grid>
                                      
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Hourly Rate"
                                                    type="number"
                                                    variant="outlined"
                                                    size="small"
                                                    value={typeof service.hourly_rate === 'number' && !isNaN(service.hourly_rate) ? service.hourly_rate : ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        updateService(index, 'hourly_rate', isNaN(val) ? '' : val);
                                                    }}
                                                    slotProps={{
                                                        input: {
                                                            startAdornment: <InputAdornment position="start"><Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>R</Typography></InputAdornment>,
                                                            sx: { fontWeight: 800 }
                                                        }
                                                    }}
                                                />
                                            </Grid>
                                        
                                        <Grid size={12}>
                                            <TextField
                                                fullWidth
                                                label="Description"
                                                multiline
                                                rows={2}
                                                placeholder="Describe what this service includes..."
                                                variant="outlined"
                                                size="small"
                                                value={service.description}
                                                onChange={(e) => updateService(index, 'description', e.target.value)}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <BriefcaseIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>No services listed yet.</Typography>
                        <Typography variant="caption" color="text.disabled">Click "Add Service" to start building your profile.</Typography>
                    </Box>
                )}

                <Alert
                    severity="info"
                    icon={<InfoIcon fontSize="small" />}
                    sx={{ mt: 4, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.dark' }}>
                        All profile changes require administrative verification before becoming public.
                    </Typography>
                </Alert>
            </Box>

            <Box sx={{ p: 3, borderTop: '1px solid', borderColor: alpha(theme.palette.divider, 0.08), display: 'flex', justifyContent: 'flex-end', bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                <Button
                    variant="contained"
                    size="large"
                    disabled={saving}
                    onClick={handleSave}
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    sx={{
                        fontWeight: 800,
                        borderRadius: 2,
                        px: 4,
                        boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                >
                    {saving ? "Saving Changes..." : "Submit for Approval"}
                </Button>
            </Box>
        </Paper>
    );
};

export default ServiceManagement;
