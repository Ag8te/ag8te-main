import { useState } from "react";
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
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
    car_make: string;
    car_model: string;
    car_year: number;
    registration_number: string;
    car_type: 'standard' | 'premium' | 'suv';
    color: string; // NEW
    images: File[]; // NEW (multiple photos)
    disk_document: File | null; // NEW (vehicle disk
    preview_images?: string[]; // for UI preview only
    disk_preview?: string; // file name preview

}

interface VehicleManagementProps {
    initialVehicles: Vehicle[];
}

export const VehicleManagement = ({ initialVehicles }: VehicleManagementProps) => {
    const { toast } = useToast();
    const theme = useTheme();
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles || []);
    const [saving, setSaving] = useState(false);
    
    //updated added new vehicle features
    const addVehicle = () => {
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
         console.log(vehicles);
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

        if (!v.images || v.images.length < 3) {
            toast({ title: "Validation Error", description: "Upload at least 3 vehicle images", variant: "destructive" });
            return;
        }

        if (!v.disk_document) {
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
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Manage your registered fleet and categories.</Typography>
                    </Box>
                </Stack>
                <Button
                    variant="outlined"
                    startIcon={<PlusIcon />}
                    onClick={addVehicle}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                    Add Vehicle
                </Button>
            </Box>

            <Box sx={{ p: 3 }}>
                {vehicles.length > 0 ? (
                    <Stack spacing={3}>
                        {vehicles.map((vehicle, index) => (
                            <Card key={index} variant="outlined" sx={{ borderRadius: 2, position: 'relative', overflow: 'visible' }}>
                                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
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
      src={img}
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
          if (removedPreview) URL.revokeObjectURL(removedPreview);
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
    
    <Typography variant="caption">
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
                    {saving ? "Saving changes..." : "Submit for Approval"}
                </Button>
            </Box>



        </Paper>
    );
};



export default VehicleManagement;
