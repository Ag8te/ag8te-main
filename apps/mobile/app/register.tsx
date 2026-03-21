import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { 
  Mail, Lock, User, UserPlus, ArrowLeft, Phone, Shield, 
  FileText, Camera, Check, X, Info, Globe, Briefcase, Award,
  ChevronDown, Search
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Modal, FlatList, TextInput as RNTextInput } from 'react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/Theme';
import { COUNTRIES } from '../constants/Countries';
import { Typography } from '../components/UI/Typography';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import apiClient from '../api/client';

export default function Register() {
    const router = useRouter();
    const { register } = useAuth();

    // ─── State ─────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Role/Account, 2: Personal, 3: Services/Docs
    
    // Account details
    const [role, setRole] = useState('client');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Personal information
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [nationality, setNationality] = useState('South Africa');
    const [idNumber, setIdNumber] = useState('');
    const [agentId, setAgentId] = useState('');

    // Next of Kin
    const [nokName, setNokName] = useState('');
    const [nokPhone, setNokPhone] = useState('');
    const [nokEmail, setNokEmail] = useState('');

    // Professional info
    const [highestQualification, setHighestQualification] = useState('');
    const [professionalBody, setProfessionalBody] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [serviceOptions, setServiceOptions] = useState<any[]>([]);
    const [customService, setCustomService] = useState('');

    // Documents & Payment
    const [files, setFiles] = useState<{[key: string]: any}>({});
    const [selectedProvider, setSelectedProvider] = useState<string>("paypal");
    const [availableGateways, setAvailableGateways] = useState<any[]>([]);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    // ─── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (role === 'service-provider' || role === 'professional') {
            apiClient.get(`/public/service-options?category=${role}`).then((res: any) => {
                if (res.data?.success && res.data.data?.services) {
                    setServiceOptions(res.data.data.services);
                }
            }).catch(err => console.error("Failed to load services", err));
        }
    }, [role]);

    useEffect(() => {
        apiClient.get('/public/payment-gateways').then((res: any) => {
                if (res.data?.success && res.data.data?.gateways) {
                    const gateways = res.data.data.gateways.filter((g: any) => g.is_enabled);
                    setAvailableGateways(gateways);
                    if (gateways.length > 0 && !gateways.find((g: any) => g.name.toLowerCase() === selectedProvider)) {
                        setSelectedProvider(gateways[0].name.toLowerCase());
                    }
                }
        }).catch(err => console.error("Failed to load gateways", err));
    }, []);

    // ─── Helpers ───────────────────────────────────────────────────────────────
    const pickImage = async (field: string) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            setFiles(prev => ({
                ...prev,
                [field]: {
                    uri: asset.uri,
                    name: asset.fileName || `${field}.jpg`,
                    type: 'image/jpeg'
                }
            }));
        }
    };

    const pickDocument = async (field: string) => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            setFiles(prev => ({
                ...prev,
                [field]: {
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType || 'application/octet-stream'
                }
            }));
        }
    };

    const validateStep1 = () => {
        if (!name || !surname || !email || !password || !confirmPassword || !role) return "Please fill in all account fields";
        if (password !== confirmPassword) return "Passwords do not match";
        if (password.length < 8) return "Password must be at least 8 characters";
        return null;
    };

    const validateStep2 = () => {
        if (!phone || !gender || !nationality || !idNumber) return "Please fill in all personal details";
        if (!nokName || (!nokPhone && !nokEmail)) return "Next of kin name and contact info required";
        if (phone.length < 10) return "Please enter a valid phone number";
        if (nationality === 'South Africa' && idNumber.length !== 13) return "South African ID must be 13 digits";
        return null;
    };
    
    const validateStep3 = () => {
        // All users need profile photo and ID document (mirroring web requirement)
        if (!files.profile_photo) return "Profile photo is required";
        if (!files.id_document) return "ID document is required";

        if (role !== 'client') {
            if (!files.proof_of_residence) return "Proof of residence is required";
            if (role === 'driver' && !files.drivers_license) return "Driver's license is required";
            if (role === 'professional') {
                if (!highestQualification) return "Highest qualification is required";
                if (!files.cv_resume) return "CV/Resume is required";
                if (!files.qualification_documents) return "Qualification documents are required";
            }
        }
        return null;
    };

    const handleRegister = async () => {
        const err = validateStep3();
        if (err) { Alert.alert('Error', err); return; }

        setLoading(true);
        try {
            const formData = new FormData();
            
            const registrationData = {
                email, password, password_confirm: confirmPassword,
                role, full_name: name, surname, phone,
                gender, nationality, id_number: idNumber,
                next_of_kin: { full_name: nokName, contact_number: nokPhone, contact_email: nokEmail },
                highest_qualification: highestQualification, professional_body: professionalBody, agent_id: agentId,
                professional_services: role === 'professional' ? selectedServices.map(s => ({name: s, description: ""})) : [],
                provider_services: role === 'service-provider' ? selectedServices.map(s => ({name: s, description: ""})) : [],
                provider: selectedProvider
            };

            formData.append("registration_data", JSON.stringify(registrationData));
            
            // Append files
            Object.keys(files).forEach(key => {
                if (files[key]) {
                    formData.append(key, files[key] as any);
                }
            });

            const result = await register(formData);
            if (result.success) {
                Alert.alert('Success', 'Registration successful! Please check your email for verification.', [
                    { text: 'OK', onPress: () => router.replace('/login' as any) }
                ]);
            } else {
                Alert.alert('Registration Failed', result.error);
            }
        } catch (error: any) {
            console.error("Register error:", error);
            Alert.alert('Error', error.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.topNav}>
                    <TouchableOpacity style={styles.backButton} onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
                        <ArrowLeft color={COLORS.gray[800]} size={24} />
                    </TouchableOpacity>
                    <Typography variant="label" color={COLORS.gray[500]}>Step {step} of 3</Typography>
                </View>

                <View style={styles.header}>
                    <Typography variant="h1" style={styles.title}>
                        {step === 1 ? 'Create Account' : step === 2 ? 'Personal Info' : 'Verification'}
                    </Typography>
                </View>

                {step === 1 && (
                    <Card style={styles.formCard}>
                        <Typography variant="label" style={styles.sectionTitle}>Account Details</Typography>
                        
                        <Typography variant="caption" color={COLORS.gray[600]} style={{ marginBottom: 4 }}>Register as</Typography>
                        <View style={styles.roleGrid}>
                            {['client', 'driver', 'professional', 'service-provider'].map(r => (
                                <TouchableOpacity 
                                    key={r} 
                                    onPress={() => setRole(r)}
                                    style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                                >
                                    <Typography variant="caption" color={role === r ? COLORS.white : COLORS.gray[600]} weight="semibold" style={{ textTransform: 'capitalize' }}>
                                        {r.replace('-', ' ')}
                                    </Typography>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.row}>
                            <Input
                                label="First Name"
                                placeholder="Thabo"
                                value={name}
                                onChangeText={setName}
                                containerStyle={{ flex: 1, marginRight: SPACING.xs }}
                            />
                            <Input
                                label="Surname"
                                placeholder="Mokoena"
                                value={surname}
                                onChangeText={setSurname}
                                containerStyle={{ flex: 1 }}
                            />
                        </View>

                        <Input
                            label="Email Address"
                            placeholder="name@example.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            icon={<Mail color={COLORS.gray[400]} size={20} />}
                        />
                        <Input
                            label="Password"
                            placeholder="Min 8 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            icon={<Lock color={COLORS.gray[400]} size={20} />}
                        />
                        <Input
                            label="Confirm Password"
                            placeholder="Repeat password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            icon={<Shield color={COLORS.gray[400]} size={20} />}
                        />

                        <Button
                            title="Continue"
                            onPress={() => {
                                const err = validateStep1();
                                if (err) Alert.alert('Invalid', err);
                                else setStep(2);
                            }}
                            style={{ marginTop: SPACING.md }}
                        />
                    </Card>
                )}

                {step === 2 && (
                    <Card style={styles.formCard}>
                        <Typography variant="label" style={styles.sectionTitle}>Identity & Contact</Typography>
                        
                        <Input
                            label="Phone Number"
                            placeholder="081 000 1111"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            icon={<Phone color={COLORS.gray[400]} size={20} />}
                        />
                        
                        <Typography variant="caption" color={COLORS.gray[600]} style={{ marginBottom: 4 }}>Gender</Typography>
                        <View style={styles.roleGrid}>
                            {['male', 'female', 'other'].map(g => (
                                <TouchableOpacity 
                                    key={g} 
                                    onPress={() => setGender(g)}
                                    style={[styles.roleBtn, gender === g && styles.roleBtnActive, { flex: 1 }]}
                                >
                                    <Typography variant="caption" color={gender === g ? COLORS.white : COLORS.gray[600]} weight="semibold" style={{ textTransform: 'capitalize' }}>
                                        {g}
                                    </Typography>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity 
                            style={styles.pickerTrigger} 
                            onPress={() => setShowCountryPicker(true)}
                        >
                            <Typography variant="caption" color={COLORS.gray[600]} style={{ marginBottom: 4 }}>Nationality</Typography>
                            <View style={styles.pickerValue}>
                                <Globe color={COLORS.gray[400]} size={20} />
                                <Typography variant="body" style={{ flex: 1, marginLeft: 10 }}>{nationality}</Typography>
                                <ChevronDown color={COLORS.gray[400]} size={20} />
                            </View>
                        </TouchableOpacity>

                        <Input
                            label={nationality === 'South Africa' ? "ID Number (13 digits)" : "Passport Number"}
                            placeholder="Enter number"
                            value={idNumber}
                            onChangeText={setIdNumber}
                            keyboardType={nationality === 'South Africa' ? "number-pad" : "default"}
                        />

                        <Input
                            label="Agent / Affiliate Code (Optional)"
                            placeholder="e.g. AGT001"
                            value={agentId}
                            onChangeText={setAgentId}
                            autoCapitalize="characters"
                        />

                        <Typography variant="label" style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Next of Kin</Typography>
                        <Input
                            label="Full Name"
                            placeholder="Kin's full name"
                            value={nokName}
                            onChangeText={setNokName}
                        />
                        <View style={styles.row}>
                            <Input
                                label="Contact Phone"
                                placeholder="081..."
                                value={nokPhone}
                                onChangeText={setNokPhone}
                                keyboardType="phone-pad"
                                containerStyle={{ flex: 1, marginRight: SPACING.xs }}
                            />
                            <Input
                                label="Contact Email"
                                placeholder="kin@example.com"
                                value={nokEmail}
                                onChangeText={setNokEmail}
                                keyboardType="email-address"
                                containerStyle={{ flex: 1 }}
                            />
                        </View>

                        <Button
                            title="Continue"
                            onPress={() => {
                                const err = validateStep2();
                                if (err) Alert.alert('Invalid', err);
                                else setStep(3);
                            }}
                            style={{ marginTop: SPACING.md }}
                        />
                    </Card>
                )}

                {step === 3 && (
                    <Card style={styles.formCard}>
                        <Typography variant="label" style={styles.sectionTitle}>Verification & Payment</Typography>
                        
                        {role === 'professional' && (
                            <View style={{ marginBottom: SPACING.md }}>
                                <Input
                                    label="Highest Qualification"
                                    placeholder="e.g. BCom Accounting"
                                    value={highestQualification}
                                    onChangeText={setHighestQualification}
                                />
                                <Input
                                    label="Professional Body (Optional)"
                                    placeholder="e.g. SAICA"
                                    value={professionalBody}
                                    onChangeText={setProfessionalBody}
                                />
                            </View>
                        )}

                        {(role === 'professional' || role === 'service-provider') && (
                            <View style={{ marginBottom: SPACING.md }}>
                                <Typography variant="caption" color={COLORS.gray[600]} style={{ marginBottom: 8 }}>
                                    Select Your Services
                                </Typography>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceList}>
                                    {serviceOptions.map(opt => (
                                        <TouchableOpacity 
                                            key={opt.id}
                                            style={[styles.serviceTag, selectedServices.includes(opt.name) && styles.serviceTagActive]}
                                            onPress={() => {
                                                if (selectedServices.includes(opt.name)) {
                                                    setSelectedServices(selectedServices.filter(s => s !== opt.name));
                                                } else {
                                                    setSelectedServices([...selectedServices, opt.name]);
                                                }
                                            }}
                                        >
                                            <Typography variant="caption" color={selectedServices.includes(opt.name) ? COLORS.white : COLORS.gray[600]}>
                                                {opt.name}
                                            </Typography>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                
                                <View style={[styles.row, { marginTop: SPACING.sm }]}>
                                    <Input
                                        placeholder="Add custom service..."
                                        value={customService}
                                        onChangeText={setCustomService}
                                        containerStyle={{ flex: 1, marginBottom: 0, marginRight: SPACING.xs }}
                                    />
                                    <Button 
                                        title="Add" 
                                        onPress={() => {
                                            if (customService.trim() && !selectedServices.includes(customService.trim())) {
                                                setSelectedServices([...selectedServices, customService.trim()]);
                                                setCustomService('');
                                            }
                                        }}
                                        style={{ width: 80, height: 52 }}
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.uploadSection}>
                            <Typography variant="caption" color={COLORS.gray[700]} weight="bold">Verification Documents</Typography>
                            
                            <FileRow 
                                label="Profile Photo" 
                                picked={!!files.profile_photo} 
                                onPick={() => pickImage('profile_photo')}
                                icon={<Camera size={20} color={COLORS.gray[400]} />} 
                            />
                            <FileRow 
                                label="ID Document" 
                                picked={!!files.id_document} 
                                onPick={() => pickDocument('id_document')}
                                icon={<FileText size={20} color={COLORS.gray[400]} />} 
                            />
                            {role !== 'client' && (
                                <FileRow 
                                    label="Proof of Residence" 
                                    picked={!!files.proof_of_residence} 
                                    onPick={() => pickDocument('proof_of_residence')}
                                    icon={<Globe size={20} color={COLORS.gray[400]} />} 
                                />
                            )}
                            {role === 'driver' && (
                                <FileRow 
                                    label="Driver's License" 
                                    picked={!!files.drivers_license} 
                                    onPick={() => pickDocument('drivers_license')}
                                    icon={<Award size={20} color={COLORS.gray[400]} />} 
                                />
                            )}
                            {role === 'professional' && (
                                    <>
                                        <FileRow 
                                            label="CV / Resume" 
                                            picked={!!files.cv_resume} 
                                            onPick={() => pickDocument('cv_resume')}
                                            icon={<FileText size={20} color={COLORS.gray[400]} />} 
                                        />
                                        <FileRow 
                                            label="Qualification Docs" 
                                            picked={!!files.qualification_documents} 
                                            onPick={() => pickDocument('qualification_documents')}
                                            icon={<Briefcase size={20} color={COLORS.gray[400]} />} 
                                        />
                                    </>
                                )}
                            </View>

                        {availableGateways.length > 0 && (
                            <View style={styles.paymentSelector}>
                                <Typography variant="caption" color={COLORS.gray[700]} weight="bold" style={{ marginBottom: 8 }}>
                                    Choose Registration Payment
                                </Typography>
                                <View style={styles.row}>
                                    {availableGateways.map(gateway => (
                                        <TouchableOpacity 
                                            key={gateway.id}
                                            onPress={() => setSelectedProvider(gateway.name.toLowerCase())}
                                            style={[
                                                styles.providerBtn, 
                                                selectedProvider === gateway.name.toLowerCase() && styles.providerBtnActive
                                            ]}
                                        >
                                            <Typography 
                                                variant="caption" 
                                                color={selectedProvider === gateway.name.toLowerCase() ? COLORS.primary : COLORS.gray[500]} 
                                                weight="bold"
                                                style={{ textTransform: 'capitalize' }}
                                            >
                                                {gateway.name}
                                            </Typography>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <Button
                            title="Complete Registration"
                            onPress={handleRegister}
                            loading={loading}
                            style={{ marginTop: SPACING.md }}
                        />
                    </Card>
                )}

                <View style={styles.footer}>
                    <Typography variant="body" color={COLORS.gray[600]}>Already have an account? </Typography>
                    <TouchableOpacity onPress={() => router.push('/login' as any)}>
                        <Typography variant="body" color={COLORS.primary} weight="bold">Log In</Typography>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal
                visible={showCountryPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCountryPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Typography variant="h2">Select Nationality</Typography>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <X color={COLORS.gray[800]} size={24} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchInputContainer}>
                            <Search color={COLORS.gray[400]} size={20} />
                            <RNTextInput
                                placeholder="Search countries..."
                                style={styles.searchInput}
                                value={countrySearch}
                                onChangeText={setCountrySearch}
                                autoCapitalize="none"
                            />
                        </View>

                        <FlatList
                            data={COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.countryItem}
                                    onPress={() => {
                                        setNationality(item);
                                        setShowCountryPicker(false);
                                        setCountrySearch('');
                                    }}
                                >
                                    <Typography variant="body">{item}</Typography>
                                    {nationality === item && <Check color={COLORS.primary} size={20} />}
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

function FileRow({ label, picked, onPick, icon }: { label: string, picked: boolean, onPick: () => void, icon: any }) {
    return (
        <TouchableOpacity style={styles.fileRow} onPress={onPick}>
            <View style={styles.fileRowLeft}>
                {icon}
                <Typography variant="caption" style={{ marginLeft: 10 }}>{label}</Typography>
            </View>
            {picked ? <Check color={COLORS.primary} size={20} /> : <Typography variant="caption" color={COLORS.primary}>Upload</Typography>}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: SPACING.lg,
        paddingTop: Platform.OS === 'ios' ? SPACING.xl : SPACING.xxl,
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 44,
        height: 44,
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: SIZES.font.xxl,
        fontWeight: 'bold',
    },
    formCard: {
        marginBottom: SPACING.xl,
        padding: SPACING.lg,
    },
    sectionTitle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: SPACING.md,
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: SPACING.lg,
    },
    roleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: COLORS.gray[100],
        borderWidth: 1,
        borderColor: COLORS.gray[200],
    },
    roleBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    serviceList: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    serviceTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: COLORS.gray[100],
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
    },
    serviceTagActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    uploadSection: {
        marginTop: SPACING.md,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    fileRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentSelector: {
        marginTop: SPACING.lg,
        padding: SPACING.md,
        backgroundColor: COLORS.gray[50],
        borderRadius: 12,
    },
    providerBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: COLORS.gray[200],
        marginHorizontal: 4,
    },
    providerBtnActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        paddingBottom: SPACING.xl,
    },
    pickerTrigger: {
        marginBottom: SPACING.md,
    },
    pickerValue: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: COLORS.gray[200],
        borderRadius: SIZES.radius.md,
        height: 52,
        paddingHorizontal: SPACING.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: SPACING.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[100],
        borderRadius: 12,
        paddingHorizontal: SPACING.md,
        height: 48,
        marginBottom: SPACING.md,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: COLORS.gray[800],
    },
    countryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[50],
    },
});
