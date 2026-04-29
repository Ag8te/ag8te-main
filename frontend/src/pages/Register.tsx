import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Autocomplete, TextField } from "@mui/material";
import {
  Eye, EyeOff, Mail, Lock, Phone, ChevronRight, Check, AlertTriangle,
  UploadCloud, X, FileText, ShieldCheck, AlertCircle, Loader2, UserCircle, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/pages/Terms";
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from "@/pages/Privacy";

const REGISTRATION_DRAFT_KEY = "registrationDraft";


// ─── Design tokens ────────────────────────────────────────────────────────────
const baseInput = "w-full bg-slate-50/50 border rounded-2xl py-4 text-[#222222] placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all font-medium h-14";
const validInput = `${baseInput} border-[#DDDDDD] focus:ring-primary/10 focus:border-primary/50`;
const errorInput = `${baseInput} border-red-300 bg-red-50/30 focus:ring-red-100 focus:border-red-400`;

const selectBase = "w-full bg-slate-50/50 border rounded-2xl px-4 text-[#222222] focus:outline-none focus:ring-4 transition-all font-medium h-14 appearance-none";
const validSelect = `${selectBase} border-[#DDDDDD] focus:ring-primary/10 focus:border-primary/50`;
const errorSelect = `${selectBase} border-red-300 bg-red-50/30 focus:ring-red-100 focus:border-red-400`;

const fieldLabel = "text-[13px] font-bold text-[#222222] tracking-wide ml-1";
const sectionLabel = "text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2";



// ─── Types ────────────────────────────────────────────────────────────────────
type FormFields = {
  name: string; surname: string; email: string; phone: string;
  password: string; confirmPassword: string; gender: string;
  nationality: string; id_number: string; role: string;
  nokName: string; nokPhone: string; nokEmail: string;
  highestQualification: string; professionalBody: string; agent_id: string;
  // Driver fields
carMake: string;
carModel: string;
carYear: string;
carPlate: string;

// Services
serviceDescription: string;
carColor: string;
};

type FieldErrors = Partial<Record<keyof FormFields, string>>;
//Updated phoneregex
const phoneRegex = /^(?:\+27|0)[6-8][0-9]{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Field-level validators ───────────────────────────────────────────────────
const validators: Partial<Record<keyof FormFields, (v: string, form?: FormFields) => string>> = {
 //added name validation and surname validation also email for a valid email address
  name: (v) =>!v.trim() ? "First name is required" : !/^[A-Za-z\s'-]+$/.test(v) ? "Name must contain only letters": "",
  surname: (v) => !v.trim() ? "Surname is required" : !/^[A-Za-z\s'-]+$/.test(v) ? "Surname must contain only letters" : "",
  email: (v) => !v.trim() ? "Email is required" : !emailRegex.test(v) ? "Enter a valid email address" : "",
  password: (v) => !v ? "Password is required" : v.length < 8 ? "Password must be at least 8 characters" : "",
  confirmPassword: (v, f) => !v ? "Please confirm your password" : v !== f?.password ? "Passwords do not match" : "",
  phone: (v) => !v.trim() ? "Phone number is required" : !phoneRegex.test(v) ? "Use only digits, spaces or +" : "",
  //Full SA ID check including date validation
  id_number: (v, f) => {
  if (!v.trim()) return "ID / Passport number is required";

  // ─── SOUTH AFRICA LOGIC ───
  if (f?.nationality === "South Africa") {

    if (!/^\d{13}$/.test(v)) return "SA ID must be 13 digits";

    // Extract date
    const year = parseInt(v.substring(0, 2));
    const month = parseInt(v.substring(2, 4));
    const day = parseInt(v.substring(4, 6));

    const fullYear = year > 50 ? 1900 + year : 2000 + year;

    const date = new Date(fullYear, month - 1, day);

    if (
      date.getFullYear() !== fullYear ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    ) {
      return "Invalid birth date in ID";
    }

    // ─── GENDER CHECK ───
    const genderDigits = parseInt(v.substring(6, 10));
    const idGender = genderDigits >= 5000 ? "male" : "female";

    if (f?.gender && f.gender !== idGender) {
      return `ID indicates ${idGender}, but selected gender is ${f.gender}`;
    }

    // ─── CHECKSUM (LUHN) ───
    let sum = 0;
    let alternate = false;

    for (let i = v.length - 1; i >= 0; i--) {
      let n = parseInt(v[i]);

      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }

      sum += n;
      alternate = !alternate;
    }

    if (sum % 10 !== 0) {
      return "Invalid SA ID (checksum failed)";
    }
  }

  // ─── PASSPORT ───
  else {
    if (v.length < 6) return "Invalid passport number";
  }

  return "";
},
  gender: (v) => !v ? "Please select your gender" : "",
  nokName: (v) => !v.trim() ? "Next of Kin full name is required" : "",
  nokPhone: (v) => v.trim() && !phoneRegex.test(v) ? "Use only digits, spaces or +" : "",
  role: (v) => !v ? "Please select a role to register as" : "",
  nationality: (v) => !v ? "Please select your nationality" : "",
  nokEmail: (v) => v.trim() && !emailRegex.test(v) ? "Enter a valid email address" : "",
  carMake: (v, f) =>
  f?.role === "driver" && !v.trim() ? "Car make is required" : "",

carModel: (v, f) =>
  f?.role === "driver" && !v.trim() ? "Car model is required" : "",

carYear: (v, f) =>
  f?.role === "driver"
    ? !/^\d{4}$/.test(v)
      ? "Enter valid year"
      : ""
    : "",

carPlate: (v, f) =>
  f?.role === "driver" && !v.trim() ? "License plate is required" : "",

serviceDescription: (v, f) =>
  (f?.role === "professional" || f?.role === "service-provider") && !v.trim()
    ? "Service description is required"
    : "",
    //Added new validation
    carColor: (v, f) =>
  f?.role === "driver" && !v.trim() ? "Car color is required" : "",
};
const serviceOptions1 = [
  { name: "Electrical Installation" },
  { name: "Electrical Maintenance" },
  { name: "Plumbing" },
  { name: "Carpentry" },
  { name: "Welding" },
  { name: "Cleaning Services" },
  { name: "Gardening" },
  { name: "Painting" },
  { name: "IT Support" },
  { name: "Web Development" },
];

const professionOptions1 = [
  { name: "Electrician" },
  { name: "Plumber" },
  { name: "Carpenter" },
  { name: "Welder" },
  { name: "Software Developer" },
  { name: "Mechanic" },
];

// ─── Country List ─────────────────────────────────────────────────────────────
const countries = [
  "South Africa", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua & Deps", "Argentina",
  "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Rep",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Congo {Democratic Rep}", "Costa Rica", "Croatia",
  "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland {Republic}", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "Korea North", "Korea South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar, {Burma}",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway",
  "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russian Federation", "Rwanda", "St Kitts & Nevis", "St Lucia",
  "Saint Vincent & the Grenadines", "Samoa", "San Marino", "Sao Tome & Principe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad & Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// ─── Inline error helper ──────────────────────────────────────────────────────
const FieldError = ({ msg }: { msg?: string }) => (
  <AnimatePresence mode="wait">
    {msg && (
      <motion.p
        key={msg}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-1.5 mt-1.5 ml-1 text-[12px] font-semibold text-red-500"
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {msg}
      </motion.p>
    )}
  </AnimatePresence>
);

// ─── Required star ────────────────────────────────────────────────────────────
const Req = () => <span className="text-red-500 ml-0.5">*</span>;

// ─── Legend ───────────────────────────────────────────────────────────────────
const RequiredLegend = () => (
  <p className="text-[11px] text-slate-400 font-medium ml-1 mb-6 -mt-2">
    Fields marked <span className="text-red-500 font-bold">*</span> are required
  </p>
);

const Register = () => {
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [form, setForm] = useState<FormFields>({
    name: "", surname: "", email: "", phone: "", password: "", confirmPassword: "",
    gender: "", nationality: "", id_number: "", role: "",
    nokName: "", nokPhone: "", nokEmail: "",
    highestQualification: "", professionalBody: "", agent_id: "",
    carMake: "",
carModel: "",
carYear: "",
carPlate: "",
serviceDescription: "",
carColor: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    profile_photo: null, id_document: null, proof_of_residence: null,
    drivers_license: null, cv_resume: null, qualification_documents: null,
  });
  const [previews, setPreviews] = useState<{ [key: string]: string | null }>({});

  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
  const [legalReviewed, setLegalReviewed] = useState<{ terms: boolean; privacy: boolean }>({ terms: false, privacy: false });
  const { register } = useAuth();
  const { toast } = useToast();
  const termsConsentRef = useRef<HTMLButtonElement | null>(null);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [professionOptions, setProfessionOptions] = useState<any[]>([]);
  //Added new 
  const [carImages, setCarImages] = useState<File[]>([]);
  const [carPreviews, setCarPreviews] = useState<string[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  

  const legalTab = legalModal ?? "terms";

  const closeLegalModal = () => {
    setLegalModal(null);
    window.setTimeout(() => {
      termsConsentRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (form.role === 'service-provider' || form.role === 'professional') {
      apiFetch(`/api/public/service-options?category=${form.role}`).then((res: any) => {
        if (res?.success && res.data?.services) {
          setServiceOptions(res.data.services || []);
          setProfessionOptions(res.data.professions || []);
        }
      });
    }
  }, [form.role]);

  useEffect(() => {
    const rawDraft = localStorage.getItem(REGISTRATION_DRAFT_KEY);
    if (!rawDraft) {
      setDraftRestored(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      if (draft?.form) {
        setForm((prev) => ({ ...prev, ...draft.form }));
      }
      if (Array.isArray(draft?.selectedServices)) {
        setSelectedServices(draft.selectedServices);
      }
      if (typeof draft?.agreed === "boolean") {
        setAgreed(draft.agreed);
      }
    } catch (error) {
      console.error("Failed to restore registration draft:", error);
    } finally {
      setDraftRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!draftRestored) return;

    localStorage.setItem(
      REGISTRATION_DRAFT_KEY,
      JSON.stringify({
        form,
        selectedServices,
        agreed,
        profession_offered: selectedProfessions,
        service_offered: selectedServices,
      })
    );
  }, [draftRestored, form, selectedServices, agreed]);

  useEffect(() => {
     const professionOptionsList = Array.isArray(professionOptions)
     ? professionOptions.map((opt: any) => opt.name || opt)
     : [];

     const serviceOptionsList = Array.isArray(serviceOptions)
     ? serviceOptions.map((opt: any) => opt.name || opt)
     : [];
    if (isSubmitted) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isSubmitted]);

  // ─── Update field + clear its error ────────────────────────────────────────

  const update = (field: keyof FormFields, value: string) => {

  // Normalize
  if (field === "email") value = value.toLowerCase().trim();
  if (field === "password") value = value.trim();
  if (field === "agent_id") value = value.toUpperCase();

  setForm((f) => {
    const next = { ...f, [field]: value };
     // ─── AUTO-DETECT GENDER FROM SA ID ───
 if (field === "id_number" && value.length === 13) {
   const genderDigits = parseInt(value.substring(6, 10));
   const idGender = genderDigits >= 5000 ? "male" : "female";

   next.gender = idGender; //auto-set gender
 }

    if (touched[field]) {
      const validate = validators[field];
      const msg = validate ? validate(value, next) : "";
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    }

    //  Fix confirm password bug
    if (field === "password" && next.confirmPassword) {
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword:
          next.confirmPassword !== value ? "Passwords do not match" : ""
      }));
    }

    return next;
  });
};

  // ─── Blur → mark touched + validate ────────────────────────────────────────
  const handleBlur = (field: keyof FormFields) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const validate = validators[field];
    if (validate) {
      const msg = validate(form[field], form);
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    }
  };

  // ─── Validate all fields, return true if clean ─────────────────────────────
  const validateAll = (): boolean => {
    const errors: FieldErrors = {};
    (Object.keys(validators) as (keyof FormFields)[]).forEach((field) => {
      const msg = validators[field]!(form[field], form);
      if (msg) errors[field] = msg;
    });
    // nokPhone/nokEmail — at least one required
    if (!form.nokPhone.trim() && !form.nokEmail.trim()) {
      errors.nokPhone = "Provide at least a phone or email for next of kin";
    }
    setFieldErrors(errors);
    // Mark everything touched so errors show
    const allTouched: Partial<Record<keyof FormFields, boolean>> = {};
    (Object.keys(form) as (keyof FormFields)[]).forEach((k) => { allTouched[k] = true; });
    setTouched(allTouched);

    //Validating service and qualififcation

//     if (
//   (form.role === "professional" || form.role === "service-provider") &&
//   selectedServices.length === 0
// ) {
//   setServerError("Please select at least one service");
//   return false;
// }

// professional qualification
if (form.role === "professional" && !form.highestQualification.trim()) {
  errors.highestQualification = "Highest qualification is required";
}

if (form.role === "driver") {
  if (!form.carMake || !form.carModel || !form.carYear || !form.carPlate) {
    setServerError("Please complete all vehicle details");
    return false;
  }
}

// validate pictures
if (form.role === "driver" && carImages.length < 3) {
  setServerError("Please upload at least 3 car images");
  return false;
}

    return Object.keys(errors).length === 0;
  };

  // ─── File helpers ───────────────────────────────────────────────────────────
  //updated files uploading
  const validateFile = (file: File, field?: string) => {
  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) return "File too large. Max 5MB allowed.";

  const allowedTypes: Record<string, string[]> = {
    profile_photo: ["image/jpeg", "image/png"],
    id_document: ["image/jpeg", "image/png", "application/pdf"],
    proof_of_residence: ["image/jpeg", "image/png", "application/pdf"],
    drivers_license: ["image/jpeg", "image/png", "application/pdf"],
    cv_resume: ["application/pdf"],
    qualification_documents: ["image/jpeg", "image/png", "application/pdf"],
  };

  if (field && allowedTypes[field] && !allowedTypes[field].includes(file.type)) {
    return "Invalid file type for this document";
  }

  return null;
};

  const updateFile = (field: string, file: File | null) => {
    if (file) {
      const err = validateFile(file, field);
      if (err) { toast({ title: "Upload Error", description: err, variant: "destructive" }); return; }
      if (file.type.startsWith("image/")) {
        setPreviews((p) => ({ ...p, [field]: URL.createObjectURL(file) }));
      } else {
        setPreviews((p) => ({ ...p, [field]: null }));
      }
    } else {
      if (previews[field]) URL.revokeObjectURL(previews[field]!);
      setPreviews((p) => ({ ...p, [field]: null }));
    }
    setFiles((f) => ({ ...f, [field]: file }));
  };

  useEffect(() => {
    return () => { Object.values(previews).forEach((url) => { if (url) URL.revokeObjectURL(url); }); };
  }, [previews]);

  //Added new handlecar images
  const handleCarImages = (files: FileList | null) => {
  if (!files) return;

  const newFiles = Array.from(files);

  // Limit max images (optional: 6)
  const updated = [...carImages, ...newFiles].slice(0, 6);

  setCarImages(updated);

  const previews = updated.map((file) => URL.createObjectURL(file));
  setCarPreviews(previews);
};

//added new remove image function
const removeCarImage = (index: number) => {
  const updatedFiles = carImages.filter((_, i) => i !== index);
  const updatedPreviews = carPreviews.filter((_, i) => i !== index);

  setCarImages(updatedFiles);
  setCarPreviews(updatedPreviews);
};
  // ─── Password strength ──────────────────────────────────────────────────────
  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return { score: 0, label: "", color: "" };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
    const colors = ["", "bg-red-400", "bg-yellow-400", "bg-yellow-400", "bg-primary", "bg-primary"];
    return { score, label: labels[score], color: colors[score] };
  })();

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    

    if (!validateAll()) {
      setServerError("Please fix the highlighted fields before continuing.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // File-level checks (shown in top banner — not per-field)
    if (!form.role) { setServerError("Please select a role to register as"); return; }
    if (!files.profile_photo) { setServerError("Profile photo is required"); return; }
    if (!files.id_document) { setServerError("ID document is required"); return; }
    if (form.role === "driver" && (!files.proof_of_residence || !files.drivers_license)) {
      setServerError("Drivers need Proof of Residence and Driver's License"); return;
    }
    if ((form.role === "professional" || form.role === "service-provider") && !files.proof_of_residence) {
      setServerError("Professionals & Service Providers require Proof of Residence"); return;
    }
    if (form.role === "professional" && (!form.highestQualification || !files.cv_resume || !files.qualification_documents)) {
      setServerError("Professionals require Highest Qualification, CV, and Qualification Documents"); return;
    }
    if (!agreed) { setServerError("You must agree to the Terms of Service and Privacy Policy"); return; }

    setLoading(true);
    try {
      const payloadServices = selectedServices.map(s => ({ name: s, description: "" }));
      const formData = new FormData();
      formData.append("registration_data", JSON.stringify({
        car_details: form.role === "driver" ? {
        make: form.carMake,
        model: form.carModel,
        year: form.carYear,
        plate: form.carPlate,
        color: form.carColor
        }: null,



        service_description:
        (form.role === "professional" || form.role === "service-provider")
        ? form.serviceDescription
         : "",
        email: form.email, password: form.password, password_confirm: form.confirmPassword,
        role: form.role, full_name: form.name, surname: form.surname, phone: form.phone,
        gender: form.gender, nationality: form.nationality, id_number: form.id_number,
        next_of_kin: { full_name: form.nokName, contact_number: form.nokPhone, contact_email: form.nokEmail },
        highest_qualification: form.highestQualification, professional_body: form.professionalBody, agent_id: form.agent_id,
        professional_services: form.role === 'professional' ? payloadServices : [],
        provider_services: form.role === 'service-provider' ? payloadServices : [],
        professions_offered: selectedProfessions,
      }));
      if (files.profile_photo) formData.append("profile_photo", files.profile_photo);
      carImages.forEach((file) => {
        formData.append("car_images", file);
      });
      if (files.id_document) formData.append("id_document", files.id_document);
      if (files.proof_of_residence) formData.append("proof_of_residence", files.proof_of_residence);
      if (files.drivers_license) formData.append("drivers_license", files.drivers_license);
      if (files.cv_resume) formData.append("cv_resume", files.cv_resume);
      if (files.qualification_documents) formData.append("qualification_documents", files.qualification_documents);

      const result = await register(formData);
      if (result.success) {
        if (result.data?.redirect_url) {
          localStorage.setItem("registrationPaymentUser", JSON.stringify(result.data.user));
          window.location.href = result.data.redirect_url;
          return;
        }

        localStorage.removeItem(REGISTRATION_DRAFT_KEY);
        toast({ title: "Registration Complete", description: "Your account has been created successfully." });
        setIsSubmitted(true);
      } else {
        setServerError(result.error || "Registration failed");
      }
     } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "An unexpected error occurred");
     } finally {
      setLoading(false);
     }

    
  };

  // ─── Shared input class helper ──────────────────────────────────────────────
  const ic = (field: keyof FormFields, withLeftPad = false, withRightPad = false) => {
    const base = fieldErrors[field] ? errorInput : validInput;
    let cls = base;
    if (withLeftPad) cls = cls.replace("py-4", "py-4 pl-12");
    else cls += " px-4";
    if (withRightPad) cls += " pr-12";
    return cls;
  };

  // ─── File Upload Area ───────────────────────────────────────────────────────
  const FileUploadArea = ({ label, field, accept, required = false }: {
    label: string; field: string; accept: string; required?: boolean;
  }) => {
    const file = files[field];
    const preview = previews[field];
    const isImage = file?.type.startsWith("image/");
     

    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between ml-1">
          <label className={fieldLabel}>
            {label}{required && <Req />}
          </label>
          {file && (
            <button type="button"
              onClick={(e) => { e.preventDefault(); updateFile(field, null); }}
              className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1"
            >
              <X size={11} /> Remove
            </button>
          )}
        </div>

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-2.5 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                <UploadCloud size={22} />
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-bold text-[#222222]">Click to upload</span> or drag & drop
              </p>
              <p className="text-[11px] text-slate-400">PNG, JPG or PDF (MAX. 5MB)</p>
            </div>
            <input type="file" accept={accept} className="hidden"
              onChange={(e) => updateFile(field, e.target.files?.[0] || null)} />
          </label>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-4"
          >
            {isImage && preview ? (
              <div className="h-16 w-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText size={28} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#222222] truncate">{file.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-500 font-bold">
                <Check size={13} /> Ready to upload
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-white font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2314B8A6\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-100" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-24 pb-12">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
            <Card className="bg-white border border-slate-100 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden text-center">
              <CardContent className="p-10 sm:p-14">
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-10 w-10" />
                </div>
                <h1 className="text-3xl font-bold text-[#222222] tracking-tight mb-3">
                  Registration Complete
                </h1>
                <p className="text-slate-600 text-base mb-8">
                  Your account has been created successfully. You can now sign in and start using MzansiServe.
                </p>
                <div className="space-y-3">
                  <Button asChild className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-xl shadow-primary/10 transition-all active:scale-[0.98]">
                    <Link to="/login">Go to Login</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full h-12 rounded-2xl text-slate-500">
                    <Link to="/">Return Home</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    );
  }

  // ─── Registration form ──────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2314B8A6\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-100" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-3xl"
        >
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-[#222222] hover:text-primary transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to website</span>
          </Link>

          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-[#222222] tracking-tight mb-3">Create your account</h1>
            <p className="text-slate-600 text-base font-normal">Join the MzansiServe community today.</p>
          </div>

          <Card className="bg-white border border-slate-100 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
            <CardContent className="p-8 sm:p-12">

              {/* Server / file error banner */}
              <AnimatePresence mode="wait">
                {serverError && (
                  <motion.div
                    key="server-error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{serverError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-10" noValidate autoComplete="off">

                {/* ── Account Details ── */}
                <section className="space-y-5">
                  <p className={sectionLabel}><UserCircle className="w-4 h-4" /> Account Details</p>
                  <RequiredLegend />
                  <div className="grid gap-5 sm:grid-cols-2">

                    {/* Role */}
                    <div className="space-y-1 sm:col-span-2">
                      <label htmlFor="role" className={fieldLabel}>Register as<Req /></label>
                      <select id="role" value={form.role}
                        onChange={(e) => update("role", e.target.value)}
                        className={fieldErrors.role ? errorSelect : validSelect}>
                        <option value="" disabled>Select Role...</option>
                        <option value="client">Client</option>
                        <option value="driver">Driver</option>
                        <option value="professional">Professional</option>
                        <option value="service-provider">Service Provider</option>
                      </select>
                      <FieldError msg={fieldErrors.role} />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label htmlFor="email" className={fieldLabel}>Email Address<Req /></label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input id="email" type="email" placeholder="you@example.co.za"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          onBlur={() => handleBlur("email")}
                          className={ic("email", true)}
                          autoComplete="off" />
                      </div>
                      <FieldError msg={fieldErrors.email} />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label htmlFor="password" className={fieldLabel}>Password<Req /></label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input id="password" type={showPassword ? "text" : "password"}
                          placeholder="Min 8 characters"
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          onBlur={() => handleBlur("password")}
                          className={ic("password", true, true)}
                          autoComplete="off" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {form.password && (
                        <div className="flex items-center gap-2 mt-1.5 ml-1">
                          <div className="flex gap-1 flex-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div key={n} className={`h-1 flex-1 rounded-full transition-all ${n <= passwordStrength.score ? passwordStrength.color : "bg-slate-100"}`} />
                            ))}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">{passwordStrength.label}</span>
                        </div>
                      )}
                      <FieldError msg={fieldErrors.password} />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label htmlFor="confirm-password" className={fieldLabel}>Confirm Password<Req /></label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input id="confirm-password" type="password" placeholder="Re-enter password"
                          value={form.confirmPassword}
                          onChange={(e) => update("confirmPassword", e.target.value)}
                          onBlur={() => handleBlur("confirmPassword")}
                          className={ic("confirmPassword", true)}
                          autoComplete="off" />
                      </div>
                      <FieldError msg={fieldErrors.confirmPassword} />
                    </div>
                  </div>
                </section>

                {/* ── Personal Information ── */}
                <section className="space-y-5 pt-6 border-t border-slate-50">
                  <p className={sectionLabel}>Personal Information</p>
                  <div className="grid gap-5 sm:grid-cols-2">

                    <div className="space-y-1">
                      <label className={fieldLabel}>First Name<Req /></label>
                      <input placeholder="Thabo" value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        onBlur={() => handleBlur("name")}
                        className={ic("name")} />
                      <FieldError msg={fieldErrors.name} />
                    </div>

                    <div className="space-y-1">
                      <label className={fieldLabel}>Surname<Req /></label>
                      <input placeholder="Mokoena" value={form.surname}
                        onChange={(e) => update("surname", e.target.value)}
                        onBlur={() => handleBlur("surname")}
                        className={ic("surname")} />
                      <FieldError msg={fieldErrors.surname} />
                    </div>

                    <div className="space-y-1">
                      <label className={fieldLabel}>Phone<Req /></label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input type="tel" placeholder="081 000 1111" value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          onBlur={() => handleBlur("phone")}
                          className={ic("phone", true)} />
                      </div>
                      <FieldError msg={fieldErrors.phone} />
                    </div>

                    <div className="space-y-1">
                      <label className={fieldLabel}>Gender<Req /></label>
                      <select value={form.gender}
                        onChange={(e) => update("gender", e.target.value)}
                        onBlur={() => handleBlur("gender")}
                        className={fieldErrors.gender ? errorSelect : validSelect}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <FieldError msg={fieldErrors.gender} />
                    </div>

                    <div className="space-y-1">
                      <label className={fieldLabel}>Nationality<Req /></label>
                      <Autocomplete
                        autoHighlight={false}
                        openOnFocus={false}
                        options={countries}
                        value={form.nationality}
                        onChange={(_, newValue) => {
                          update("nationality", newValue || "");
                        }}
                        renderInput={(params) => (
                          <div ref={params.InputProps.ref} className="w-full">
                            <input
                              {...params.inputProps}
                              placeholder="Search country..."
                              className={ic("nationality")}
                              autoComplete="new-password"
                            />
                          </div>
                        )}
                      />
                      <FieldError msg={fieldErrors.nationality} />
                    </div>

                    <div className="space-y-1">
                      <label className={fieldLabel}>
                        {form.nationality === "South Africa" ? "ID Number" : "Passport Number"}<Req />
                      </label>
                      <input placeholder="Enter ID/Passport" value={form.id_number}
                        onChange={(e) => update("id_number", e.target.value)}
                        onBlur={() => handleBlur("id_number")}
                        className={ic("id_number")} />
                      <FieldError msg={fieldErrors.id_number} />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className={fieldLabel}>
                        Agent / Affiliate Code{" "}
                        <span className="text-slate-400 font-normal text-[12px]">(optional)</span>
                      </label>
                      <input placeholder="e.g. AGT001" value={form.agent_id}
                        onChange={(e) => update("agent_id", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-primary placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-mono font-bold uppercase tracking-widest h-14" />
                    </div>
                  </div>
                </section>

                {/* ── Next of Kin ── */}
                <section className="space-y-5 pt-6 border-t border-slate-50">
                  <div>
                    <p className={sectionLabel}>Next of Kin</p>
                    <p className="text-[11px] text-slate-400 font-medium ml-1 -mt-4 mb-4">
                      Provide at least a <span className="font-bold text-slate-500">phone</span> or <span className="font-bold text-slate-500">email</span> for your next of kin
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-3">

                    <div className="space-y-1">
                      <label className={fieldLabel}>Full Name<Req /></label>
                      <input type="text" placeholder="Full name" value={form.nokName}
                        onChange={(e) => update("nokName", e.target.value)}
                        onBlur={() => handleBlur("nokName")}
                        className={ic("nokName")} />
                      <FieldError msg={fieldErrors.nokName} />
                    </div>

                    <div className="space-y-1">
                      <label className={fieldLabel}>Phone</label>
                      <input type="tel" placeholder="Contact number" value={form.nokPhone}
                        onChange={(e) => update("nokPhone", e.target.value)}
                        onBlur={() => handleBlur("nokPhone")}
                        className={ic("nokPhone")} />
                      <FieldError msg={fieldErrors.nokPhone} />
                    </div>

                    <div className="space-y-1">
                      <label className={fieldLabel}>Email</label>
                      <input type="email" placeholder="contact@email.com" value={form.nokEmail}
                        onChange={(e) => update("nokEmail", e.target.value)}
                        className={ic("nokEmail")} />
                      <FieldError msg={fieldErrors.nokEmail} />
                    </div>
                  </div>
                </section>

                {/* ── Professional Info (conditional) ── */}
                <AnimatePresence>
                  {form.role === "professional" && (
                    <motion.section
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-5 pt-6 border-t border-slate-50"
                    >
                      <p className={sectionLabel}>Professional Information</p>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className={fieldLabel}>Highest Qualification<Req /></label>
                          <input placeholder="e.g. Bachelor of Science" value={form.highestQualification}
                            onChange={(e) => update("highestQualification", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-[#222222] placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-medium h-14" />
                        </div>
                        <div className="space-y-1">
                          <label className={fieldLabel}>Professional Body</label>
                          <input placeholder="e.g. SAICA" value={form.professionalBody}
                            onChange={(e) => update("professionalBody", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-[#222222] placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-medium h-14" />
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>

                {/* ── Services Offered ── */}
               
                <AnimatePresence>
  {(form.role === "professional" || form.role === "service-provider") && (
    <motion.section
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden space-y-5 pt-6 border-t border-slate-50"
    >
      <p className={sectionLabel}>
        <UserCircle className="w-4 h-4" /> Profession & Services Offered
      </p>

    {form.role === "professional" && (
  <div className="space-y-1">
    <label className={fieldLabel}>
      Select or Add Profession
      <span className="text-slate-400 font-normal"> (Multiple allowed)</span>
    </label>

    <Autocomplete
      multiple
      freeSolo
      options={professionOptions1.map(opt =>
        typeof opt === "string" ? opt : opt.name
      )}
      value={selectedProfessions}
      onChange={(_, newValue) =>
        setSelectedProfessions(newValue as string[])
      }
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="e.g. Electrician"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px", //  rounded input
              backgroundColor: "#f8fafc"
            }
          }}
        />
      )}
    />
  </div>
)}


{form.role === "service-provider" && (
  <div className="space-y-1">
    <label className={fieldLabel}>
      Select or Add Service
      <span className="text-slate-400 font-normal"> (Multiple allowed)</span>
    </label>

    <Autocomplete
      multiple
      freeSolo
      options={serviceOptions1.map(opt =>
        typeof opt === "string" ? opt : opt.name
      )}
      value={selectedServices}
      onChange={(_, newValue) =>
        setSelectedServices(newValue as string[])
      }
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="e.g. Electrical Maintenance"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px", //  rounded input
              backgroundColor: "#f8fafc"
            }
          }}
        />
      )}
    />
  </div>
)}
    </motion.section>
                  )}
                   {(form.role === "professional" || form.role === "service-provider") && (
  <div className="space-y-1 mt-4">
    <label className={fieldLabel}>Service Description<Req /></label>
    <textarea
      value={form.serviceDescription}
      onChange={(e) => update("serviceDescription", e.target.value)}
      onBlur={() => handleBlur("serviceDescription")}
      className="w-full bg-slate-50 border rounded-2xl p-4 h-28"
    />
    <FieldError msg={fieldErrors.serviceDescription} />
  </div>
)}
                </AnimatePresence>

                {/* ── vehicle information ── */}
                 
                 <AnimatePresence>
  {form.role === "driver" && (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-5 pt-6 border-t border-slate-50"
    >
      <p className={sectionLabel}>Vehicle Information</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <input
          placeholder="Car Make"
          value={form.carMake}
          onChange={(e) => update("carMake", e.target.value)}
          onBlur={() => handleBlur("carMake")}
          className={ic("carMake")}
        />
        <FieldError msg={fieldErrors.carMake} />

        <input
          placeholder="Car Model"
          value={form.carModel}
          onChange={(e) => update("carModel", e.target.value)}
          onBlur={() => handleBlur("carModel")}
          className={ic("carModel")}
        />
        <FieldError msg={fieldErrors.carModel} />

        <input
          placeholder="Year"
          value={form.carYear}
          onChange={(e) => update("carYear", e.target.value)}
          onBlur={() => handleBlur("carYear")}
          className={ic("carYear")}
        />
        <FieldError msg={fieldErrors.carYear} />

        <input
          placeholder="License Plate"
          value={form.carPlate}
          onChange={(e) => update("carPlate", e.target.value)}
          onBlur={() => handleBlur("carPlate")}
          className={ic("carPlate")}
        />
        <FieldError msg={fieldErrors.carPlate} />

        <input
          placeholder="Car Color"
          value={form.carColor}
          onChange={(e) => update("carColor", e.target.value)}
          onBlur={() => handleBlur("carColor")}
          className={ic("carColor")}
        />
         <FieldError msg={fieldErrors.carColor} />

      </div>

      {/* Image Button */}

      <div className="space-y-3">
  <label className={fieldLabel}>
    Car Images (Minimum 3)<Req />
  </label>

  {/* Upload Button */}
  <input
    type="file"
    multiple
    accept="image/*"
    onChange={(e) => handleCarImages(e.target.files)}
  />

  {/* Preview */}
  <div className="grid grid-cols-3 gap-3 mt-3">
    {carPreviews.map((src, index) => (
      <div key={index} className="relative">
        <img
          src={src}
          className="w-full h-24 object-cover rounded-xl"
        />
        <button
          type="button"
          onClick={() => removeCarImage(index)}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
</div>

    </motion.section>
  )}
</AnimatePresence>

                {/* ── Verification Documents ── */}
                <section className="space-y-5 pt-6 border-t border-slate-50">
                  <p className={sectionLabel}><ShieldCheck className="w-4 h-4" /> Verification Documents</p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FileUploadArea label="Profile Photo" field="profile_photo" accept="image/*" required />
                    <FileUploadArea label="ID Document / Passport" field="id_document" accept=".pdf,.jpg,.jpeg,.png" required />
                    {(form.role === "driver" || form.role === "professional" || form.role === "service-provider") && (
                      <FileUploadArea label="Proof of Residence" field="proof_of_residence" accept=".pdf,.jpg,.jpeg,.png" required />
                    )}
                    {form.role === "driver" && (
                      <FileUploadArea label="Driver's License" field="drivers_license" accept=".pdf,.jpg,.jpeg,.png" required />
                    )}
                    {form.role === "professional" && (
                      <>
                        <FileUploadArea label="CV / Resume" field="cv_resume" accept=".pdf,.doc,.docx" required />
                        <FileUploadArea label="Qualification Documents" field="qualification_documents" accept=".pdf,.jpg,.jpeg,.png" required />
                      </>
                    )}
                  </div>
                </section>

                {/* ── Terms & Submit ── */}
                <section className="pt-6 border-t border-slate-50 space-y-6">
                  <div className="flex items-start gap-3">
                    <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)}
                      ref={termsConsentRef}
                      className="mt-1 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <label htmlFor="terms" className="text-sm font-medium text-slate-600 leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLegalModal("terms"); }}
                        className="font-bold text-[#222222] underline underline-offset-4 hover:text-primary transition-colors"
                      >
                        Terms of Service
                      </button>
                      {" "}and{" "}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLegalModal("privacy"); }}
                        className="font-bold text-[#222222] underline underline-offset-4 hover:text-primary transition-colors"
                      >
                        Privacy Policy
                      </button>
                      <Req />
                    </label>
                  </div>

                  {form.role && form.role !== "client" && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Registration Payment</p>
                      <p className="text-sm text-slate-600">
                        Drivers, professionals, and service providers complete registration with a once-off Yoco payment of <span className="font-bold text-[#222222]">R100.00</span>.
                      </p>
                    </div>
                  )}

                  <Button
                    id="register-submit-button"
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-[0.98] h-14 text-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {form.role === "client" ? "Create Account" : "Pay & Complete Registration"} <ChevronRight className="w-5 h-5" />
                      </span>
                    )}
                  </Button>
                </section>
              </form>
            </CardContent>

            <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-8 flex justify-center">
              <p className="text-slate-600 font-normal text-sm">
                Already have an account?{" "}
                <Link id="register-login-link" to="/login" className="text-primary font-bold hover:underline underline-offset-4 decoration-2">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      <Dialog open={legalModal !== null} onOpenChange={(open) => { if (!open) closeLegalModal(); }}>
        <DialogContent className="w-screen h-screen max-w-none rounded-none p-0 overflow-hidden border-0 bg-white shadow-2xl sm:w-[95vw] sm:max-w-5xl sm:h-[88vh] sm:rounded-lg sm:border sm:border-slate-200">
          <Tabs value={legalTab} onValueChange={(value) => setLegalModal(value as "terms" | "privacy")} className="h-full flex flex-col">
            <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    Legal Information
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Review the Terms of Service and Privacy Policy without leaving your registration progress.
                  </p>
                </div>
                <TabsList className="bg-white border border-slate-200 p-1 h-11">
                  <TabsTrigger value="terms" className="px-4 font-semibold">Terms</TabsTrigger>
                  <TabsTrigger value="privacy" className="px-4 font-semibold">Privacy</TabsTrigger>
                </TabsList>
              </div>
            </DialogHeader>

            <TabsContent value="terms" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(88vh-150px)] px-6 py-5">
                <div className="max-w-3xl mx-auto space-y-6 pb-6">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
                    <h3 className="text-xl font-bold text-slate-900">Terms of Service</h3>
                    <p className="text-sm text-slate-500 mt-1">Last updated: {TERMS_LAST_UPDATED}</p>
                  </div>
                  {TERMS_SECTIONS.map((section, index) => (
                    <section key={section.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <h4 className="text-base font-bold text-slate-900 mb-3">
                        {index + 1}. {section.title}
                      </h4>
                      <div className="whitespace-pre-line text-sm leading-7 text-slate-600">
                        {section.content}
                      </div>
                    </section>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(88vh-150px)] px-6 py-5">
                <div className="max-w-3xl mx-auto space-y-6 pb-6">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
                    <h3 className="text-xl font-bold text-slate-900">Privacy Policy</h3>
                    <p className="text-sm text-slate-500 mt-1">Last updated: {PRIVACY_LAST_UPDATED}</p>
                  </div>
                  {PRIVACY_SECTIONS.map((section, index) => (
                    <section key={section.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <h4 className="text-base font-bold text-slate-900 mb-3">
                        {index + 1}. {section.title}
                      </h4>
                      <div className="whitespace-pre-line text-sm leading-7 text-slate-600">
                        {section.content}
                      </div>
                    </section>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="legal-reviewed"
                    checked={legalReviewed[legalTab]}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setLegalReviewed((prev) => ({ ...prev, [legalTab]: isChecked }));
                    }}
                    className="mt-1 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="legal-reviewed" className="text-sm font-medium text-slate-600 leading-relaxed cursor-pointer">
                    I have reviewed the {legalTab === "terms" ? "Terms of Service" : "Privacy Policy"}.
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Closing this popup returns you to the same registration form with your information preserved.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeLegalModal}
                  className="h-11 rounded-xl border-slate-200 font-bold px-5"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={closeLegalModal}
                  disabled={!legalReviewed[legalTab]}
                  className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold px-5 disabled:opacity-50"
                >
                  Accept and Close
                </Button>
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Register;
