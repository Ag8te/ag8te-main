import { useEffect, useRef, useState } from "react";
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
    MenuItem
} from "@mui/material";
import {
    Add as PlusIcon,
    DeleteOutline as TrashIcon,
    Save as SaveIcon,
    DirectionsCar as CarIcon,
    CalendarMonth as CalendarIcon,
    Pin as HashIcon,
    Settings as SettingsIcon
} from "@mui/icons-material";
import { apiFetch, getImageUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
    car_make: string;
    car_model: string;
    car_year: number;
    registration_number: string;
    car_type: 'standard' | 'premium' | 'suv' | 'sedan' | 'luxury' | 'small_hatchback';
    color: string;
    images: File[];
    disk_document: File | null;
    preview_images?: string[];
    disk_preview?: string;
    approval_status?: 'approved' | 'pending';
}

interface VehicleManagementProps {
    initialVehicles: Vehicle[];
    pendingVehicles?: Vehicle[];
    hasPendingVehicleUpdate?: boolean;
}

export const VehicleManagement = ({
    initialVehicles,
    pendingVehicles = [],
    hasPendingVehicleUpdate = false,
}: VehicleManagementProps) => {
    const { toast } = useToast();
    const theme = useTheme();
    const approvedSignatureRef = useRef("");
    const pendingSignatureRef = useRef("");

    const normalizeVehicle = (vehicle: any, approvalStatus: Vehicle["approval_status"] = "approved"): Vehicle => ({
        car_make: vehicle?.car_make || vehicle?.make || "",
        car_model: vehicle?.car_model || vehicle?.model || "",
        car_year: Number(vehicle?.car_year || vehicle?.year) || new Date().getFullYear(),
        registration_number: vehicle?.registration_number || vehicle?.registration || vehicle?.license_plate || vehicle?.plate || "",
        car_type: (vehicle?.car_type || "standard") as Vehicle["car_type"],
        color: vehicle?.color || "",
        images: [],
        disk_document: null,
        preview_images: Array.isArray(vehicle?.images)
            ? vehicle.images.filter((img: any) => typeof img === "string")
            : [],
        disk_preview: typeof vehicle?.disk_document === "string"
            ? vehicle.disk_document
            : (typeof vehicle?.disk_preview === "string" ? vehicle.disk_preview : ""),
        approval_status: approvalStatus,
    });

    const getVehicleSignature = (vehicleList: any[] = []) =>
        JSON.stringify(
            vehicleList.map((vehicle) => ({
                car_make: vehicle?.car_make || vehicle?.make || "",
                car_model: vehicle?.car_model || vehicle?.model || "",
                car_year: Number(vehicle?.car_year || vehicle?.year) || new Date().getFullYear(),
                registration_number: vehicle?.registration_number || vehicle?.registration || vehicle?.license_plate || vehicle?.plate || "",
                car_type: vehicle?.car_type || "standard",
                color: vehicle?.color || "",
                images: Array.isArray(vehicle?.images) ? vehicle.images.filter((img: any) => typeof img === "string") : [],
                disk_document: typeof vehicle?.disk_document === "string" ? vehicle.disk_document : "",
            }))
        );

    const [vehicles, setVehicles] = useState<Vehicle[]>((initialVehicles || []).map(normalizeVehicle));
    const [pendingQueue, setPendingQueue] = useState<Vehicle[]>((pendingVehicles || []).map((vehicle) => normalizeVehicle(vehicle, "pending")));
    const [saving, setSaving] = useState(false);
    const [localPendingSubmission, setLocalPendingSubmission] = useState(false);
    const vehicleApprovalPending = hasPendingVehicleUpdate || localPendingSubmission;

    useEffect(() => {
        const nextSignature = getVehicleSignature(initialVehicles || []);
        if (nextSignature !== approvedSignatureRef.current) {
            approvedSignatureRef.current = nextSignature;
            setVehicles((initialVehicles || []).map(normalizeVehicle));
        }
    }, [initialVehicles]);

    useEffect(() => {
        const nextSignature = getVehicleSignature(pendingVehicles || []);
        if (nextSignature !== pendingSignatureRef.current) {
            pendingSignatureRef.current = nextSignature;
            setPendingQueue((pendingVehicles || []).map((vehicle) => normalizeVehicle(vehicle, "pending")));
            setLocalPendingSubmission(false);
        }
    }, [pendingVehicles]);
    
    const addVehicle = () => {
        if (vehicleApprovalPending) {
            toast({
                title: "Approval Pending",
                description: "Your last vehicle submission is still waiting for admin approval.",
                variant: "destructive"
            });
            return;
        }
        setVehicles([...vehicles, { car_make: "", car_model: "", car_year: new Date().getFullYear(), registration_number: "", car_type: 'standard', color: "", images: [], disk_document: null}]);
    };


   const removeVehicle = (index: number) => {
    const newVehicles = [...vehicles];

    // cleanup preview URLs
    newVehicles[index].preview_images?.forEach((url) => URL.revokeObjectURL(url));

    setVehicles(newVehicles.filter((_, i) => i !== index));
};

    const updateVehicle = (index: number, field: keyof Vehicle, value: any) => {
        const newVehicles = [...vehicles];
        newVehicles[index] = { ...newVehicles[index], [field]: value };
        setVehicles(newVehicles);
    };

    const handleSave = async () => {
    if (vehicleApprovalPending) {
        toast({
            title: "Approval Pending",
            description: "Wait for admin approval before submitting another vehicle update.",
            variant: "destructive"
        });
        return;
    }
    // Validation
    for (let v of vehicles) {
        if (!v.car_make.trim()) {
            toast({ title: "Validation Error", description: "Car make is required", variant: "destructive" });
            return;
        }

        if (!v.car_model.trim()) {
            toast({ title: "Validation Error", description: "Car model is required", variant: "destructive" });
            return;
        }

        if (!v.registration_number.trim()) {
            toast({ title: "Validation Error", description: "Registration number is required", variant: "destructive" });
            return;
        }

        if (!v.color?.trim()) {
            toast({ title: "Validation Error", description: "Vehicle color is required", variant: "destructive" });
            return;
        }

        const existingImageCount = v.preview_images?.length || 0;
        if ((!v.images || v.images.length < 3) && existingImageCount < 3) {
            toast({ title: "Validation Error", description: "Upload at least 3 vehicle images", variant: "destructive" });
            return;
        }

        if (!v.disk_document && !v.disk_preview) {
            toast({ title: "Validation Error", description: "Vehicle disk document is required", variant: "destructive" });
            return;
        }
    }

    setSaving(true);

    try {
        //  Create FormData (THIS IS THE FIX)
        const formData = new FormData();

        vehicles.forEach((v, index) => {
            formData.append(`vehicles[${index}][car_make]`, v.car_make);
            formData.append(`vehicles[${index}][car_model]`, v.car_model);
            formData.append(`vehicles[${index}][car_year]`, v.car_year.toString());
            formData.append(`vehicles[${index}][registration_number]`, v.registration_number);
            formData.append(`vehicles[${index}][car_type]`, v.car_type);
            formData.append(`vehicles[${index}][color]`, v.color);
             //  Append images
             v.images.forEach((img: File) => {
            formData.append(`vehicles[${index}][images]`, img);
            });
            
            

            //Append disk document
            if (v.disk_document) {
                formData.append(`vehicles[${index}][disk_document]`, v.disk_document);
            }
        });

        // Send FormData instead of JSON
        const res = await apiFetch('/api/profile', {
            method: 'PATCH',
            body: formData
        });

        if (res.success) {
            setPendingQueue(vehicles.map((vehicle) => ({
                ...vehicle,
                approval_status: "pending",
            })));
            setLocalPendingSubmission(true);
            toast({
                title: "Update Submitted",
                description: "Your vehicle changes have been submitted for admin approval."
            });
        }

    } catch (err: any) {
        toast({
            title: "Error",
            description: err.message || "Failed to submit changes",
            variant: "destructive"
        });
    } finally {
        setSaving(false);
    }
};

    return (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(theme.palette.divider, 0.08) }}>
            <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.5), borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.08), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 40, height: 40, borderRadius: 2 }}>
                        <CarIcon fontSize="small" />
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>My Vehicles</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Approved vehicles are visible to riders. New vehicle submissions need admin approval first.</Typography>
                    </Box>
                </Stack>
                <Button
                    variant="outlined"
                    startIcon={<PlusIcon />}
                    onClick={addVehicle}
                    disabled={vehicleApprovalPending}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                    Add Vehicle
                </Button>
            </Box>

            <Box sx={{ p: 3 }}>
                {vehicleApprovalPending && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 3, borderRadius: 2 }}
                    >
                        A vehicle update is waiting for admin approval. Riders and cab requests will continue using your currently approved vehicles until that review is completed.
                    </Alert>
                )}

                {vehicles.length > 0 ? (
                    <Stack spacing={3}>
                        {vehicles.map((vehicle, index) => (
                            <Card key={index} variant="outlined" sx={{ borderRadius: 2, position: 'relative', overflow: 'visible' }}>
                                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                        <Alert severity="success" icon={false} sx={{ py: 0, px: 1.5, alignItems: 'center' }}>
                                            Approved
                                        </Alert>
                                    </Stack>
                                    <Box sx={{ position: 'absolute', right: -12, top: -12 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => removeVehicle(index)}
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
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                label="Car Make"
                                                placeholder="e.g. Toyota"
                                                variant="outlined"
                                                size="small"
                                                value={vehicle.car_make}
                                                onChange={(e) => updateVehicle(index, 'car_make', e.target.value)}
                                                sx={{ '& .MuiInputBase-input': { fontWeight: 700 } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                label="Car Model"
                                                placeholder="e.g. Corolla"
                                                variant="outlined"
                                                size="small"
                                                value={vehicle.car_model}
                                                onChange={(e) => updateVehicle(index, 'car_model', e.target.value)}
                                                sx={{ '& .MuiInputBase-input': { fontWeight: 700 } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                label="Category"
                                                select
                                                size="small"
                                                value={vehicle.car_type}
                                                onChange={(e) => updateVehicle(index, 'car_type', e.target.value)}
                                            >
                                                <MenuItem value="standard">Standard Ride</MenuItem>
                                                <MenuItem value="premium">Premium Ride</MenuItem>
                                                <MenuItem value="suv">SUV / Large</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                label="Year"
                                                type="number"
                                                variant="outlined"
                                                size="small"
                                                value={vehicle.car_year ?? new Date().getFullYear()}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    updateVehicle(index, 'car_year', isNaN(val) ? new Date().getFullYear() : val);
                                                }}
                                                slotProps={{
                                                    input: {
                                                        startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                                                        sx: { fontWeight: 700 }
                                                    }
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 8 }}>
                                            <TextField
                                                fullWidth
                                                label="Registration Number"
                                                placeholder="Plate #"
                                                variant="outlined"
                                                size="small"
                                                value={vehicle.registration_number}
                                                onChange={(e) => updateVehicle(index, 'registration_number', e.target.value)}
                                                slotProps={{
                                                    input: {
                                                        startAdornment: <InputAdornment position="start"><HashIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                                                        sx: { fontWeight: 800, fontFamily: 'monospace' }
                                                    }
                                                }}
                                            />
                                        </Grid>
                                        
                                        <Grid size={{ xs: 12, md: 4 }}>
                                             <TextField
                                              fullWidth
                                              label="Color"
                                              placeholder="e.g. White"
                                               size="small"
                                              value={vehicle.color || ""}
                                              onChange={(e) => updateVehicle(index, 'color', e.target.value)}
                                            />
                                        </Grid>
                                        
                                        <Grid size={{ xs: 12 }}>
                                        <Button
                                           variant="outlined"
                                           component="label"
                                           fullWidth
                                             >
                                             Upload Vehicle Photos (Multiple)
                                             <input
                                              type="file"
                                              hidden
                                              multiple
                                              accept="image/*"
                                              onChange={(e) => {
                                              const files = Array.from(e.target.files || []);
                                              const previews = files.map(file => URL.createObjectURL(file));
                                              const updatedVehicle = {
                                                ...vehicle,
                                                images: [...(vehicle.images || []), ...files],
                                                preview_images: [...(vehicle.preview_images || []), ...previews]
                
                                              };

                                              const newVehicles = [...vehicles];
                                              newVehicles[index] = updatedVehicle;
                                              setVehicles(newVehicles);
                                              }}
                                              />
                                         </Button>
                                                  {vehicle.preview_images?.map((img, i) => (
  <Box
    key={i}
    sx={{
      position: 'relative',
      width: 80,
      height: 80
    }}
  >
    <Box
      component="img"
      src={img.startsWith('/uploads/') ? getImageUrl(img) : img}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: 2,
        border: '1px solid #ddd'
      }}
    />

    {/*  REMOVE BUTTON */}
    <IconButton
      size="small"
      onClick={() => {
        const newVehicles = [...vehicles];

         const removedPreview = newVehicles[index].preview_images?.[i];
          if (removedPreview && removedPreview.startsWith('blob:')) URL.revokeObjectURL(removedPreview);
        // remove image + preview
        newVehicles[index].images = newVehicles[index].images.filter((_, idx) => idx !== i);
        newVehicles[index].preview_images = newVehicles[index].preview_images?.filter((_, idx) => idx !== i);

        setVehicles(newVehicles);
      }}
      sx={{
        position: 'absolute',
        top: -8,
        right: -8,
        bgcolor: 'error.main',
        color: 'white',
        '&:hover': { bgcolor: 'error.dark' }
      }}
    >
      <TrashIcon fontSize="small" />
    </IconButton>
  </Box>
))}
                                           </Grid>

                                         
                                         <Grid size={{ xs: 12 }}>
                                           <Button
                                                variant="outlined"
                                                component="label"
                                                fullWidth
                                                 >
                                                 Upload Vehicle Disk
                                             <input
                                                type="file"
                                                hidden
                                                accept="image/*,application/pdf"
                                               
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                
                                                   const newVehicles = [...vehicles];
                                                   newVehicles[index] = {
                                                      ...newVehicles[index],
                                                        disk_document: file, 
                                                        disk_preview: file ? file.name : ""
                                                         };
                                                        setVehicles(newVehicles);
                                                   }}
                                             />
                                                 </Button>
                                                 {vehicle.disk_preview && (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
    
    <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
      {vehicle.disk_preview}
    </Typography>

    <IconButton
      size="small"
      onClick={() => {
        const newVehicles = [...vehicles];

        newVehicles[index].disk_document = null;
        newVehicles[index].disk_preview = "";

        setVehicles(newVehicles);
      }}
      sx={{
        bgcolor: 'error.main',
        color: 'white',
        '&:hover': { bgcolor: 'error.dark' }
      }}
    >
      <TrashIcon fontSize="small" />
    </IconButton>

  </Box>
)}
                                         </Grid>
    
                                    </Grid>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <CarIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>No vehicles registered.</Typography>
                        <Typography variant="caption" color="text.disabled">Click "Add Vehicle" to start.</Typography>
                    </Box>
                )}

                {pendingQueue.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                        <Divider sx={{ mb: 3 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                            Pending Approval
                        </Typography>
                        <Stack spacing={3}>
                            {pendingQueue.map((vehicle, index) => (
                                <Card key={`pending-${index}`} variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed', bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                            <Alert severity="warning" icon={false} sx={{ py: 0, px: 1.5, alignItems: 'center' }}>
                                                Awaiting admin approval
                                            </Alert>
                                        </Stack>
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField fullWidth label="Car Make" size="small" value={vehicle.car_make} InputProps={{ readOnly: true }} />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField fullWidth label="Car Model" size="small" value={vehicle.car_model} InputProps={{ readOnly: true }} />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField fullWidth label="Category" size="small" value={String(vehicle.car_type).replace(/_/g, " ")} InputProps={{ readOnly: true }} />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField fullWidth label="Year" size="small" value={vehicle.car_year ?? ""} InputProps={{ readOnly: true }} />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField fullWidth label="Registration Number" size="small" value={vehicle.registration_number} InputProps={{ readOnly: true }} />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField fullWidth label="Color" size="small" value={vehicle.color || ""} InputProps={{ readOnly: true }} />
                                            </Grid>
                                            {!!vehicle.preview_images?.length && (
                                                <Grid size={{ xs: 12 }}>
                                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                                        {vehicle.preview_images.map((img, imageIndex) => (
                                                            <Box
                                                                key={`pending-image-${imageIndex}`}
                                                                component="img"
                                                                src={img.startsWith('/uploads/') ? getImageUrl(img) : img}
                                                                sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 2, border: '1px solid #ddd' }}
                                                            />
                                                        ))}
                                                    </Stack>
                                                </Grid>
                                            )}
                                            {!!vehicle.disk_preview && (
                                                <Grid size={{ xs: 12 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                        Disk document: {vehicle.disk_preview}
                                                    </Typography>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </Box>
                )}

                <Alert
                    severity="info"
                    icon={<SettingsIcon fontSize="small" />}
                    sx={{ mt: 4, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.dark' }}>
                        Standard: Every day. Premium: Luxury. SUV: 6+ passengers. All verified by admin.
                    </Typography>
                </Alert>
            </Box>

            <Box sx={{ p: 3, borderTop: '1px solid', borderColor: alpha(theme.palette.divider, 0.08), display: 'flex', justifyContent: 'flex-end', bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                <Button
                    variant="contained"
                    size="large"
                    disabled={saving || vehicleApprovalPending}
                    onClick={handleSave}
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    sx={{
                        fontWeight: 800,
                        borderRadius: 2,
                        px: 4,
                        boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                >
                    {saving ? "Saving changes..." : "Submit for Approval"}
                </Button>
            </Box>



        </Paper>
    );
};



export default VehicleManagement;
