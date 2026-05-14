import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Upload as UploadIcon,
  InsertDriveFile as FileIcon,
  DirectionsCar as CarIcon,
} from "@mui/icons-material";
import { apiFetch, getImageUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ComplianceDocumentsProps {
  role: "driver" | "professional" | "service-provider";
  profileData: Record<string, any>;
  isApproved: boolean;
  onUpdate: () => void; // refreshes dashboard data after upload
}

// ── Document definitions per role ─────────────────────────────────────────────

const DRIVER_DOCS = [
  {
    key: "driver_license_url",
    label: "Driver's License",
    fileKey: "drivers_license_document",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: false,
  },
  {
    key: "prdp_document_url",
    label: "PRDP Document",
    fileKey: "prdp_document",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: false,
  },
  {
    key: "proof_of_residence_url",
    label: "Proof of Residence",
    fileKey: "proof_of_residence",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: false,
  },
];

const PROFESSIONAL_DOCS = [
  {
    key: "driver_license_url",
    label: "ID Document",
    fileKey: "drivers_license_document",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: false,
  },
  {
    key: "proof_of_residence_url",
    label: "Proof of Residence",
    fileKey: "proof_of_residence",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: false,
  },
  {
    key: "cv_resume_url",
    label: "CV / Resume",
    fileKey: "cv_resume",
    accept: ".pdf,.doc,.docx",
    multiple: false,
  },
  {
    key: "qualification_urls",
    label: "Qualification Documents",
    fileKey: "qualification_documents",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: true,
  },
];

const SERVICE_PROVIDER_DOCS = [
  {
    key: "driver_license_url",
    label: "ID Document",
    fileKey: "drivers_license_document",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: false,
  },
  {
    key: "proof_of_residence_url",
    label: "Proof of Residence",
    fileKey: "proof_of_residence",
    accept: ".pdf,.jpg,.jpeg,.png",
    multiple: false,
  },
];

const DOCS_BY_ROLE = {
  driver: DRIVER_DOCS,
  professional: PROFESSIONAL_DOCS,
  "service-provider": SERVICE_PROVIDER_DOCS,
};

// ── Component ──────────────────────────────────────────────────────────────────

export const ComplianceDocuments: React.FC<ComplianceDocumentsProps> = ({
  role,
  profileData,
  isApproved,
  onUpdate,
}) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const docs = DOCS_BY_ROLE[role] || [];

  // ── Vehicle images (driver only) ─────────────────────────────────────────
  const driverServices = profileData?.driver_services || [];
  const primaryVehicle = driverServices[0] || null;
  const vehicleImages: string[] = primaryVehicle?.images || [];
  const [vehicleUploading, setVehicleUploading] = useState(false);
  const vehicleImgRef = useRef<HTMLInputElement | null>(null);

  // ── Upload a single compliance document ──────────────────────────────────
  const handleDocUpload = async (fileKey: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(fileKey);
    try {
      const formData = new FormData();
      if (files.length === 1) {
        formData.append(fileKey, files[0]);
      } else {
        Array.from(files).forEach((f) => formData.append(fileKey, f));
      }
      await apiFetch("/api/profile", {
        method: "PATCH",
        data: formData,
      });
      toast({
        title: "Document updated",
        description: "Your document has been replaced successfully.",
      });
      onUpdate();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  // ── Upload vehicle images (driver only) ──────────────────────────────────
  const handleVehicleImagesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length < 3) {
      toast({
        title: "Too few images",
        description: "Please upload at least 3 vehicle images.",
        variant: "destructive",
      });
      return;
    }
    setVehicleUploading(true);
    try {
      const formData = new FormData();
      // Send current vehicle data as driver_services JSON so backend
      // knows which vehicle to attach images to
      if (primaryVehicle) {
        const vechicleData = [{ ...primaryVehicle, images: [] }];
        formData.append("driver_services", JSON.stringify(vechicleData));
      }
    
      Array.from(files).forEach((f) =>
        formData.append("vehicles[0][images]", f),
      );
      await apiFetch("/api/profile", {
        method: "PATCH",
        data: formData,
      });
      toast({
        title: "Vehicle images updated",
        description: "Your vehicle images have been replaced successfully.",
      });
      onUpdate();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setVehicleUploading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getDocUrl = (key: string): string | string[] | null => {
    return profileData?.[key] || null;
  };

  const isUploaded = (key: string): boolean => {
    const val = getDocUrl(key);
    if (!val) return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  };

  const primaryColor = theme.palette.primary.main;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 800 }}>
      {/* ── Status banner ─────────────────────────────────────────── */}
      {!isApproved ? (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography fontWeight={700} mb={0.5}>
            Your account is pending approval
          </Typography>
          <Typography variant="body2">
            Please ensure all required documents below are uploaded correctly.
            Admin will review them and approve your account. You can replace any
            document if you uploaded the wrong one.
          </Typography>
        </Alert>
      ) : (
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography fontWeight={700}>Account approved</Typography>
          <Typography variant="body2">
            Your documents have been verified. To update any document, please
            use the Profile page — changes will be reviewed by admin.
          </Typography>
        </Alert>
      )}

      {/* ── Compliance documents ──────────────────────────────────── */}
      <Typography variant="h6" fontWeight={700} mb={2}>
        Required Documents
      </Typography>

      <Stack spacing={2} mb={4}>
        {docs.map((doc) => {
          const uploaded = isUploaded(doc.key);
          const url = getDocUrl(doc.key);
          const isLoading = uploading === doc.fileKey;

          return (
            <Paper
              key={doc.key}
              elevation={0}
              sx={{
                p: 2.5,
                border: "1px solid",
                borderColor: uploaded
                  ? alpha(theme.palette.success.main, 0.3)
                  : alpha(theme.palette.warning.main, 0.3),
                borderRadius: 2,
                bgcolor: uploaded
                  ? alpha(theme.palette.success.main, 0.03)
                  : alpha(theme.palette.warning.main, 0.03),
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={2}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <FileIcon
                    sx={{ color: uploaded ? "success.main" : "warning.main" }}
                  />
                  <Box>
                    <Typography fontWeight={600} fontSize={14}>
                      {doc.label}
                    </Typography>
                    {uploaded ? (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        mt={0.5}
                      >
                        <CheckCircleIcon
                          sx={{ fontSize: 14, color: "success.main" }}
                        />
                        <Typography variant="caption" color="success.main">
                          Uploaded
                        </Typography>
                        {typeof url === "string" && (
                          <Typography
                            variant="caption"
                            component="a"
                            href={getImageUrl(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: primaryColor,
                              textDecoration: "underline",
                            }}
                          >
                            View
                          </Typography>
                        )}
                        {Array.isArray(url) && url.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            ({url.length} file{url.length > 1 ? "s" : ""})
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        mt={0.5}
                      >
                        <WarningIcon
                          sx={{ fontSize: 14, color: "warning.main" }}
                        />
                        <Typography variant="caption" color="warning.main">
                          Not uploaded
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>

                {/* Upload/Replace button — only for unapproved users */}
                {!isApproved && (
                  <>
                    <input
                      type="file"
                      accept={doc.accept}
                      multiple={doc.multiple}
                      style={{ display: "none" }}
                      ref={(el) => {
                        fileInputRefs.current[doc.fileKey] = el;
                      }}
                      onChange={(e) =>
                        handleDocUpload(doc.fileKey, e.target.files)
                      }
                    />
                    <Button
                      variant={uploaded ? "outlined" : "contained"}
                      size="small"
                      startIcon={
                        isLoading ? (
                          <CircularProgress size={14} />
                        ) : (
                          <UploadIcon />
                        )
                      }
                      disabled={isLoading}
                      onClick={() =>
                        fileInputRefs.current[doc.fileKey]?.click()
                      }
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        minWidth: 120,
                      }}
                    >
                      {isLoading
                        ? "Uploading..."
                        : uploaded
                          ? "Replace"
                          : "Upload"}
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* ── Vehicle images section (driver only) ─────────────────── */}
      {role === "driver" && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <CarIcon sx={{ color: primaryColor }} />
            <Typography variant="h6" fontWeight={700}>
              Vehicle Images
            </Typography>
            <Chip
              label={`${vehicleImages.length} / 3 minimum`}
              size="small"
              color={vehicleImages.length >= 3 ? "success" : "warning"}
              sx={{ ml: 1 }}
            />
          </Stack>

          {vehicleImages.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
              {vehicleImages.map((img, i) => (
                <Box
                  key={i}
                  component="img"
                  src={getImageUrl(img)}
                  alt={`Vehicle ${i + 1}`}
                  sx={{
                    width: 100,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              ))}
            </Box>
          ) : (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              No vehicle images uploaded. At least 3 are required for
              compliance.
            </Alert>
          )}

          {!isApproved && (
            <>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                multiple
                style={{ display: "none" }}
                ref={vehicleImgRef}
                onChange={(e) => handleVehicleImagesUpload(e.target.files)}
              />
              <Button
                variant={vehicleImages.length >= 3 ? "outlined" : "contained"}
                startIcon={
                  vehicleUploading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <UploadIcon />
                  )
                }
                disabled={vehicleUploading}
                onClick={() => vehicleImgRef.current?.click()}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                {vehicleUploading
                  ? "Uploading..."
                  : vehicleImages.length >= 3
                    ? "Replace All Vehicle Images"
                    : "Upload Vehicle Images (min. 3)"}
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={1}
              >
                Uploading new images will replace all existing vehicle images.
              </Typography>
            </>
          )}
        </>
      )}
    </Box>
  );
};
