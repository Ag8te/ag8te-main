import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Plus,
    Edit,
    Power,
    PowerOff,
    Search,
    Filter,
    RefreshCcw,
    Package,
    Tag,
    Layers,
    Trash2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number | string;
    status: string;
    category_id?: string;
    subcategory_id?: string;
    product_type?: 'simple' | 'variable' | 'grouped' | 'external';
    attributes?: any;
    variations?: any;
    grouped_products?: any;
    external_url?: string;
    button_text?: string;
    shipping_profile?: {
        description?: string | null;
        weight_kg?: number | null;
        length_cm?: number | null;
        width_cm?: number | null;
        height_cm?: number | null;
    } | null;
    inventory?: {
        quantity: number;
    };
    images?: {
        id: string;
        image_url: string;
    }[];
    created_at: string;
}

interface Category {
    id: string;
    title: string;
}

interface Subcategory {
    id: string;
    title: string;
}

const emptyShippingProfile = {
    description: "",
    weight_kg: "",
    length_cm: "",
    width_cm: "",
    height_cm: ""
};

const getShippingProfileForm = (product?: Product | null) => ({
    description: product?.shipping_profile?.description || "",
    weight_kg: product?.shipping_profile?.weight_kg ? String(product.shipping_profile.weight_kg) : "",
    length_cm: product?.shipping_profile?.length_cm ? String(product.shipping_profile.length_cm) : "",
    width_cm: product?.shipping_profile?.width_cm ? String(product.shipping_profile.width_cm) : "",
    height_cm: product?.shipping_profile?.height_cm ? String(product.shipping_profile.height_cm) : ""
});

export const ProductsManagement = () => {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

    // UI States
    const [loading, setLoading] = useState(false);

    // Filters & Pagination
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [categoryId, setCategoryId] = useState("all");
    const [subcategoryId, setSubcategoryId] = useState("all");
    const [page, setPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const limit = 10;

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category_id: "",
        subcategory_id: "",
        quantity: 0,
        product_type: "simple",
        external_url: "",
        button_text: "Buy Product",
        attributes: "[]",
        variations: "[]",
        grouped_products: "[]",
        shipping_description: "",
        shipping_weight_kg: "",
        shipping_length_cm: "",
        shipping_width_cm: "",
        shipping_height_cm: ""
    });
    const [formLoading, setFormLoading] = useState(false);

    // Dynamic Category Creation States
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryTitle, setNewCategoryTitle] = useState("");
    const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
    const [newSubcategoryTitle, setNewSubcategoryTitle] = useState("");

    // Image Upload & Management States
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<{ id: string, url: string }[]>([]);
    const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiFetch("/api/shop/categories");
                if (res?.success && res.data?.categories) {
                    setCategories(res.data.categories);
                }
            } catch (error) {
                console.error("Failed to fetch product categories", error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Subcategories when Category changes
    useEffect(() => {
        const fetchSubcategories = async () => {
            if (!categoryId || categoryId === "all") {
                setSubcategories([]);
                setSubcategoryId("all");
                return;
            }
            try {
                const res = await apiFetch(`/api/shop/subcategories?category_id=${encodeURIComponent(categoryId)}`);
                if (res?.success && res.data?.subcategories) {
                    setSubcategories(res.data.subcategories);
                }
            } catch (error) {
                console.error("Failed to fetch subcategories", error);
            }
        };
        fetchSubcategories();
    }, [categoryId]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const offset = (page - 1) * limit;

            let url = `/api/admin/products?limit=${limit}&offset=${offset}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (status !== "all") url += `&status=${status}`;
            if (categoryId !== "all") url += `&category_id=${categoryId}`;
            if (subcategoryId !== "all") url += `&subcategory_id=${subcategoryId}`;

            const res = await apiFetch(url, { headers: adminHeaders });
            if (res?.success) {
                setProducts(res.data.products);
                setTotalProducts(res.data.total);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load products.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [page, search, status, categoryId, subcategoryId, toast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleToggleStatus = async (productId: string, currentStatus: string) => {
        const action = currentStatus === "active" ? "deactivate" : "activate";
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/products/${productId}/${action}`, {
                method: "PATCH",
                headers: adminHeaders
            });
            if (res?.success) {
                toast({ title: "Success", description: `Product ${action}d successfully.` });
                fetchProducts();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to ${action} product.`,
                variant: "destructive"
            });
        }
    };

    const handleResetFilters = () => {
        setSearch("");
        setStatus("all");
        setCategoryId("all");
        setSubcategoryId("all");
        setPage(1);
    };

    const handleOpenModal = (product: Product | null = null) => {
        setEditingProduct(product);
        if (product) {
            const shippingProfile = getShippingProfileForm(product);
            setFormData({
                name: product.name,
                description: product.description || "",
                price: String(product.price),
                category_id: product.category_id || "",
                subcategory_id: product.subcategory_id || "",
                quantity: product.inventory?.quantity || 0,
                product_type: product.product_type || "simple",
                external_url: product.external_url || "",
                button_text: product.button_text || "Buy Product",
                attributes: product.attributes ? JSON.stringify(product.attributes) : "[]",
                variations: product.variations ? JSON.stringify(product.variations) : "[]",
                grouped_products: product.grouped_products ? JSON.stringify(product.grouped_products) : "[]",
                shipping_description: shippingProfile.description,
                shipping_weight_kg: shippingProfile.weight_kg,
                shipping_length_cm: shippingProfile.length_cm,
                shipping_width_cm: shippingProfile.width_cm,
                shipping_height_cm: shippingProfile.height_cm
            });
            setExistingImages(product.images ? product.images.map(img => ({ id: img.id, url: img.image_url })) : []);
        } else {
            setFormData({
                name: "",
                description: "",
                price: "",
                category_id: "",
                subcategory_id: "",
                quantity: 0,
                product_type: "simple",
                external_url: "",
                button_text: "Buy Product",
                attributes: "[]",
                variations: "[]",
                grouped_products: "[]",
                shipping_description: emptyShippingProfile.description,
                shipping_weight_kg: emptyShippingProfile.weight_kg,
                shipping_length_cm: emptyShippingProfile.length_cm,
                shipping_width_cm: emptyShippingProfile.width_cm,
                shipping_height_cm: emptyShippingProfile.height_cm
            });
            setExistingImages([]);
        }
        setIsCreatingCategory(false);
        setNewCategoryTitle("");
        setIsCreatingSubcategory(false);
        setNewSubcategoryTitle("");
        setImageFiles([]);
        setDeletedImageIds([]);
        setIsModalOpen(true);
    };

    const handleSaveProduct = async () => {
        if (!formData.name || !formData.price) {
            toast({ title: "Validation Error", description: "Name and Price are required", variant: "destructive" });
            return;
        }

        if (isCreatingCategory && !newCategoryTitle.trim()) {
            toast({ title: "Validation Error", description: "New Category Title is required", variant: "destructive" });
            return;
        }

        if (isCreatingSubcategory && !newSubcategoryTitle.trim()) {
            toast({ title: "Validation Error", description: "New Subcategory Title is required", variant: "destructive" });
            return;
        }

        setFormLoading(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };

            let finalCategoryId = formData.category_id;
            let finalSubcategoryId = formData.subcategory_id;

            // 1. Create Category if needed
            if (isCreatingCategory && newCategoryTitle.trim()) {
                const catRes = await apiFetch("/api/admin/categories", {
                    method: "POST",
                    headers: adminHeaders,
                    data: { title: newCategoryTitle }
                });
                if (catRes?.success) {
                    finalCategoryId = catRes.data.id || catRes.data.category?.id;
                    // Refresh categories list in background
                    apiFetch("/api/shop/categories").then(res => {
                        if (res?.success) setCategories(res.data.categories);
                    });
                } else {
                    throw new Error("Failed to create new category");
                }
            }

            // 2. Create Subcategory if needed
            if (isCreatingSubcategory && newSubcategoryTitle.trim() && finalCategoryId) {
                const subRes = await apiFetch("/api/admin/subcategories", {
                    method: "POST",
                    headers: adminHeaders,
                    data: { title: newSubcategoryTitle, category_id: finalCategoryId }
                });
                if (subRes?.success) {
                    finalSubcategoryId = subRes.data.id || subRes.data.subcategory?.id;
                    // Refresh subcategories if not creating a new category
                    if (!isCreatingCategory) {
                        apiFetch(`/api/shop/subcategories?category_id=${finalCategoryId}`).then(res => {
                            if (res?.success) setSubcategories(res.data.subcategories);
                        });
                    }
                } else {
                    throw new Error("Failed to create new subcategory");
                }
            }

            const url = editingProduct
                ? `/api/admin/products/${editingProduct.id}`
                : "/api/admin/products";

            const method = editingProduct ? "PATCH" : "POST";

            const formDataPayload = new FormData();
            formDataPayload.append("name", formData.name);
            formDataPayload.append("description", formData.description);
            formDataPayload.append("price", formData.price);
            if (finalCategoryId) formDataPayload.append("category_id", finalCategoryId);
            if (finalSubcategoryId) formDataPayload.append("subcategory_id", finalSubcategoryId);
            formDataPayload.append("quantity", String(formData.quantity));
            formDataPayload.append("product_type", formData.product_type);
            formDataPayload.append("external_url", formData.external_url);
            formDataPayload.append("button_text", formData.button_text);
            formDataPayload.append("attributes", formData.attributes);
            formDataPayload.append("variations", formData.variations);
            formDataPayload.append("grouped_products", formData.grouped_products);
            formDataPayload.append("shipping_description", formData.shipping_description);
            formDataPayload.append("shipping_weight_kg", formData.shipping_weight_kg);
            formDataPayload.append("shipping_length_cm", formData.shipping_length_cm);
            formDataPayload.append("shipping_width_cm", formData.shipping_width_cm);
            formDataPayload.append("shipping_height_cm", formData.shipping_height_cm);

            imageFiles.forEach(file => {
                formDataPayload.append("image_files", file);
            });

            if (deletedImageIds.length > 0) {
                formDataPayload.append("deleted_image_ids", JSON.stringify(deletedImageIds));
            }

            const res = await apiFetch(url, {
                method,
                headers: adminHeaders,
                data: formDataPayload
            });

            if (res?.success) {
                toast({ title: "Success", description: `Product ${editingProduct ? "updated" : "created"} successfully.` });
                setIsModalOpen(false);
                fetchProducts();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save product.",
                variant: "destructive"
            });
        } finally {
            setFormLoading(false);
        }
    };

    const totalPages = Math.ceil(totalProducts / limit);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Product Management</h3>
                    <p className="text-sm text-slate-500">Manage your store products and inventory levels.</p>
                </div>
                <Button
                    onClick={() => handleOpenModal()}
                    className="h-10  bg-[#5e35b1] hover:bg-[#4527a0] text-white shadow-lg shadow-purple-200"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-6  shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-3 space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Search className="w-3 h-3" />
                            Search Products
                        </label>
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
                            placeholder="Product name..."
                            className="font-bold"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider flex items-center gap-2">
                            <Filter className="w-3 h-3" />
                            Status
                        </label>
                        <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                            <SelectTrigger className="h-11  border-slate-200 focus:ring-[#5e35b1]">
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent className=" border-slate-200">
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px) font-extrabold text-[#5e35b1] uppercase tracking-wider flex items-center gap-2">
                            <Tag className="w-3 h-3" />
                            Category
                        </label>
                        <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setPage(1); }}>
                            <SelectTrigger className="h-11  border-slate-200 focus:ring-[#5e35b1]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className=" border-slate-200">
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-3 h-3" />
                            Subcategory
                        </label>
                        <Select
                            value={subcategoryId}
                            onValueChange={(val) => { setSubcategoryId(val); setPage(1); }}
                            disabled={!categoryId || categoryId === "all"}
                        >
                            <SelectTrigger className="h-11  border-slate-200 focus:ring-[#5e35b1]">
                                <SelectValue placeholder="All Subcategories" />
                            </SelectTrigger>
                            <SelectContent className=" border-slate-200">
                                <SelectItem value="all">All Subcategories</SelectItem>
                                {subcategories.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.id}>{sub.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="md:col-span-3 flex gap-2">
                        <Button
                            onClick={() => setPage(1)}
                            className="flex-1 h-11  bg-[#5e35b1] hover:bg-[#4527a0] text-white font-bold shadow-sm"
                        >
                            Apply
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleResetFilters}
                            className="h-11 w-11  border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-[#5e35b1] p-0"
                            title="Reset Filters"
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className=" border border-slate-100 bg-white shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Product Info</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Inventory</th>
                                <th className="px-6 py-4 text-right text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative">
                                                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#5e35b1]  animate-spin" />
                                                <Loader2 className="w-6 h-6 text-[#5e35b1] absolute inset-0 m-auto animate-pulse" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-500">Fetching products...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Package className="w-12 h-12 text-slate-300" />
                                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">No products matching your filters</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{product.name}</span>
                                                <span className="text-[10px] font-mono text-slate-400">ID: {product.id.substring(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-[#1e88e5]">
                                                R{Number(product.price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    " border px-2.5 py-0.5 font-bold uppercase text-[10px] tracking-wider transition-all shadow-sm",
                                                    product.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                                                )}
                                            >
                                                {product.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "h-2 w-2 ",
                                                    (product.inventory?.quantity || 0) > 10 ? "bg-emerald-500" : "bg-amber-500"
                                                )} />
                                                <span className="text-sm font-bold text-slate-700">
                                                    {product.inventory?.quantity || 0} pcs
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenModal(product)}
                                                    className="h-8 w-8  text-slate-400 hover:text-[#5e35b1] hover:bg-[#ede7f6]"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                {product.status === "active" ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleToggleStatus(product.id, product.status)}
                                                        className="h-8 w-8  text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <PowerOff className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleToggleStatus(product.id, product.status)}
                                                        className="h-8 w-8  text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-8 py-6 border-t border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <Button
                            variant="ghost"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-10  font-bold text-slate-600 hover:bg-white hover:text-[#5e35b1] disabled:opacity-30 border border-transparent hover:border-slate-100 shadow-none"
                        >
                            Previous
                        </Button>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-[#5e35b1] uppercase tracking-[0.2em] mb-1">
                                Catalog Progress
                            </span>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5  transition-all duration-300",
                                            page === i + 1 ? "w-8 bg-[#5e35b1]" : "w-1.5 bg-slate-200"
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 mt-2">
                                Page {page} <span className="mx-1 text-slate-200">/</span> {totalPages}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="h-10  font-bold text-slate-600 hover:bg-white hover:text-[#5e35b1] disabled:opacity-30 border border-transparent hover:border-slate-100 shadow-none"
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            {/* Add/Edit Product Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className=" border-none shadow-2xl bg-white sm:max-w-[600px] p-8 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                            {editingProduct ? "Update Product" : "New Merchant Product"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium italic">
                            Define product attributes and inventory levels for the shop catalog.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Type</label>
                                <Select
                                    value={formData.product_type}
                                    onValueChange={(val) => setFormData({ ...formData, product_type: val })}
                                >
                                    <SelectTrigger className="h-12 border-gray-300 bg-white font-bold focus:ring-[#673ab7]">
                                        <SelectValue placeholder="Select Product Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="simple">Simple Product</SelectItem>
                                        <SelectItem value="variable">Variable Product</SelectItem>
                                        <SelectItem value="grouped">Grouped Product</SelectItem>
                                        <SelectItem value="external">External / Affiliate Product</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                                <Input
                                    placeholder="e.g. Premium Wireless Headphones"
                                    className="font-bold"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Description</label>
                                <Textarea
                                    placeholder="Describe the product features and specifications..."
                                    className="font-medium resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Retail Price (ZAR)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">R</span>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-10 font-black"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            {formData.product_type !== 'external' && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Stock</label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        className="font-black text-[#5e35b1]"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            )}

                            {formData.product_type === 'external' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">External URL</label>
                                        <Input
                                            type="url"
                                            placeholder="https://..."
                                            className="font-black text-[#5e35b1] h-11"
                                            value={formData.external_url}
                                            onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Button Text</label>
                                        <Input
                                            placeholder="Buy Product"
                                            className="font-black text-slate-700 h-11"
                                            value={formData.button_text}
                                            onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {formData.product_type !== 'external' && (
                                <>
                                    <div className="col-span-2 mt-2 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 space-y-5">
                                        <div className="space-y-1">
                                            <h4 className="text-[11px] font-black text-[#5e35b1] uppercase tracking-[0.18em]">Courier Packaging</h4>
                                            <p className="text-sm text-slate-500 font-medium">
                                                Used for Courier Guy quotes. Leave blank to fall back to the global shipping defaults.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Parcel Description</label>
                                            <Input
                                                placeholder="e.g. Folded apparel parcel"
                                                className="font-medium"
                                                value={formData.shipping_description}
                                                onChange={(e) => setFormData({ ...formData, shipping_description: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Weight (kg)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="1.25"
                                                    className="font-medium"
                                                    value={formData.shipping_weight_kg}
                                                    onChange={(e) => setFormData({ ...formData, shipping_weight_kg: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Length (cm)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="32"
                                                    className="font-medium"
                                                    value={formData.shipping_length_cm}
                                                    onChange={(e) => setFormData({ ...formData, shipping_length_cm: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Width (cm)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="24"
                                                    className="font-medium"
                                                    value={formData.shipping_width_cm}
                                                    onChange={(e) => setFormData({ ...formData, shipping_width_cm: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Height (cm)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="18"
                                                    className="font-medium"
                                                    value={formData.shipping_height_cm}
                                                    onChange={(e) => setFormData({ ...formData, shipping_height_cm: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {formData.product_type === 'variable' && (
                                <>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Attributes (JSON)</label>
                                        <Textarea
                                            placeholder={'e.g. [{"name": "Size", "options": ["S", "M", "L"]}]'}
                                            className="font-mono text-xs"
                                            value={formData.attributes}
                                            onChange={(e) => setFormData({ ...formData, attributes: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Variations (JSON)</label>
                                        <Textarea
                                            placeholder={'e.g. [{"id": "v1", "attributes": {"Size": "S"}, "price": 100, "stock": 10}]'}
                                            className="font-mono text-xs"
                                            value={formData.variations}
                                            onChange={(e) => setFormData({ ...formData, variations: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {formData.product_type === 'grouped' && (
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Grouped Product IDs (JSON Array)</label>
                                    <Input
                                        placeholder={'e.g. ["PROD-123", "PROD-456"]'}
                                        className="font-mono text-xs h-11"
                                        value={formData.grouped_products}
                                        onChange={(e) => setFormData({ ...formData, grouped_products: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Platform Category</label>
                                    <button
                                        onClick={() => {
                                            setIsCreatingCategory(!isCreatingCategory);
                                            if (!isCreatingCategory) {
                                                setIsCreatingSubcategory(true); // Usually you want a subcategory if you make a new category
                                            } else {
                                                setIsCreatingSubcategory(false);
                                            }
                                        }}
                                        className="text-[10px] font-bold text-[#5e35b1] hover:underline"
                                    >
                                        {isCreatingCategory ? "Select Existing" : "+ New Category"}
                                    </button>
                                </div>
                                {isCreatingCategory ? (
                                    <Input
                                        placeholder="Enter new category name..."
                                        className="h-12  border border-gray-300 bg-white px-4 text-[15px] font-bold text-gray-900 focus-visible:ring-1 focus-visible:ring-[#673ab7] focus:border-[#673ab7]"
                                        value={newCategoryTitle}
                                        onChange={(e) => setNewCategoryTitle(e.target.value)}
                                    />
                                ) : (
                                    <Select
                                        value={formData.category_id}
                                        onValueChange={(val) => setFormData({ ...formData, category_id: val, subcategory_id: "" })}
                                    >
                                        <SelectTrigger className="h-12  border-gray-300 bg-white font-bold focus:ring-[#673ab7] focus:border-[#673ab7]">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent className=" border-gray-300">
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Subcategory</label>
                                    <button
                                        onClick={() => setIsCreatingSubcategory(!isCreatingSubcategory)}
                                        disabled={!formData.category_id && !isCreatingCategory}
                                        className="text-[10px] font-bold text-[#5e35b1] hover:underline disabled:opacity-50 disabled:hover:no-underline"
                                    >
                                        {isCreatingSubcategory ? "Select Existing" : "+ New Subcategory"}
                                    </button>
                                </div>
                                {isCreatingSubcategory ? (
                                    <Input
                                        placeholder="Enter new subcategory name..."
                                        className="h-12  border border-gray-300 bg-white px-4 text-[15px] font-bold text-gray-900 focus-visible:ring-1 focus-visible:ring-[#673ab7] focus:border-[#673ab7]"
                                        value={newSubcategoryTitle}
                                        onChange={(e) => setNewSubcategoryTitle(e.target.value)}
                                    />
                                ) : (
                                    <Select
                                        disabled={!formData.category_id}
                                        value={formData.subcategory_id}
                                        onValueChange={(val) => setFormData({ ...formData, subcategory_id: val })}
                                    >
                                        <SelectTrigger className="h-12  border-gray-300 bg-white font-bold focus:ring-[#673ab7] focus:border-[#673ab7]">
                                            <SelectValue placeholder="Select Subcategory" />
                                        </SelectTrigger>
                                        <SelectContent className=" border-gray-300">
                                            {subcategories.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id}>{sub.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Product Images Section */}
                            <div className="col-span-2 space-y-4 border-t border-slate-100 pt-6 mt-2">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Visual Assets</h4>

                                {(existingImages.length > 0 || imageFiles.length > 0) && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {/* Render existing images */}
                                        {existingImages.map((img) => (
                                            <div key={img.id} className="relative group  overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                                                <img
                                                    src={getImageUrl(img.url)}
                                                    alt="Existing product image"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setExistingImages(prev => prev.filter(i => i.id !== img.id));
                                                        setDeletedImageIds(prev => [...prev, img.id]);
                                                    }}
                                                    className="absolute top-2 right-2 bg-rose-500 text-white p-1.5  opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Render new uploads */}
                                        {imageFiles.map((file, idx) => (
                                            <div key={idx} className="relative group  overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Upload ${idx}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-2 right-2 bg-rose-500 text-white p-1.5  opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <label className="block p-8 border-2 border-dashed border-gray-200  bg-gray-50/50 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#673ab7] hover:bg-[#ede7f6] transition-all relative overflow-hidden group">
                                    <div className="w-12 h-12 bg-white  flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                        <Layers className="w-6 h-6 text-[#673ab7]" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">Click to upload images</p>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">PNG, JPG up to 10MB</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-4 border-t border-slate-50 gap-2">
                        <Button variant="ghost" className=" font-bold text-slate-400 h-12" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className=" bg-[#5e35b1] hover:bg-[#4527a0] font-black px-10 h-12 shadow-xl shadow-purple-200"
                            onClick={handleSaveProduct}
                            disabled={formLoading}
                        >
                            {formLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (editingProduct ? "Save Changes" : "Create Product")}
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >
        </div >
    );
};
