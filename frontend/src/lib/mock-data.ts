// Mock data store - simulates database for end-to-end functionality
// Ready for migration to Supabase/SQLite

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "provider" | "admin";
  avatar?: string;
  createdAt: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  rating: number;
  reviews: number;
  location: string;
  price: string;
  priceUnit: string;
  description: string;
  verified: boolean;
  image?: string;
  available: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  seller: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  description: string;
  shipping_profile?: {
    description?: string | null;
    weight_kg?: number | null;
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
  } | null;
}

export interface Booking {
  id: string;
  userId: string;
  providerId: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: string;
}

// ─── Mock Service Providers ───
export const serviceProviders: ServiceProvider[] = [
  // Transport
  { id: "t1", name: "Sipho Nkosi", category: "Transport", subcategory: "Sedan & Hatchback", rating: 4.8, reviews: 234, location: "Johannesburg", price: "R15", priceUnit: "/km", description: "Professional sedan driver with 8+ years experience. Clean driving record.", verified: true, available: true },
  { id: "t2", name: "Thabo Mokoena", category: "Transport", subcategory: "Bakkie & LDV", rating: 4.6, reviews: 156, location: "Pretoria", price: "R22", priceUnit: "/km", description: "Reliable bakkie service for removals, deliveries, and logistics.", verified: true, available: true },
  { id: "t3", name: "Lerato Dlamini", category: "Transport", subcategory: "Shuttle & Minibus", rating: 4.9, reviews: 89, location: "Cape Town", price: "R350", priceUnit: "/trip", description: "Airport shuttle and group transport. Toyota Quantum, 14 seater.", verified: true, available: true },
  { id: "t4", name: "Mandla Zulu", category: "Transport", subcategory: "Bike Delivery", rating: 4.7, reviews: 312, location: "Durban", price: "R45", priceUnit: "/delivery", description: "Fast motorcycle courier for documents, parcels, and food delivery.", verified: true, available: false },
  { id: "t5", name: "James van Wyk", category: "Transport", subcategory: "Sedan & Hatchback", rating: 4.5, reviews: 67, location: "Stellenbosch", price: "R18", priceUnit: "/km", description: "Executive sedan service. Mercedes C-Class. Airport transfers specialist.", verified: true, available: true },
  { id: "t6", name: "Nomsa Khumalo", category: "Transport", subcategory: "Shuttle & Minibus", rating: 4.4, reviews: 45, location: "Johannesburg", price: "R280", priceUnit: "/trip", description: "School transport and corporate shuttle services.", verified: true, available: true },

  // Professionals
  { id: "p1", name: "Adv. Naledi Mthembu", category: "Professionals", subcategory: "Legal Experts", rating: 4.9, reviews: 78, location: "Sandton", price: "R2,500", priceUnit: "/consultation", description: "Senior advocate specialising in commercial law, contracts, and dispute resolution.", verified: true, available: true },
  { id: "p2", name: "Dr. Sarah Botha", category: "Professionals", subcategory: "Medical Professionals", rating: 4.8, reviews: 145, location: "Cape Town", price: "R850", priceUnit: "/session", description: "General practitioner with 15 years experience. House calls available.", verified: true, available: true },
  { id: "p3", name: "Pieter du Plessis CA(SA)", category: "Professionals", subcategory: "Financial Services", rating: 4.7, reviews: 92, location: "Pretoria", price: "R1,800", priceUnit: "/hour", description: "Chartered accountant. Tax returns, audits, business advisory.", verified: true, available: true },
  { id: "p4", name: "Eng. Kabelo Molefe", category: "Professionals", subcategory: "Engineering & Construction", rating: 4.6, reviews: 56, location: "Johannesburg", price: "R3,200", priceUnit: "/day", description: "Registered civil engineer. Structural assessments and project management.", verified: true, available: true },
  { id: "p5", name: "Adv. Michael Govender", category: "Professionals", subcategory: "Legal Experts", rating: 4.8, reviews: 123, location: "Durban", price: "R2,000", priceUnit: "/consultation", description: "Family law specialist. Divorces, custody, and estate planning.", verified: true, available: false },
  { id: "p6", name: "Dr. Amahle Ndaba", category: "Professionals", subcategory: "Medical Professionals", rating: 5.0, reviews: 67, location: "Johannesburg", price: "R1,200", priceUnit: "/session", description: "Clinical psychologist. Anxiety, depression, trauma counselling.", verified: true, available: true },

  // Services
  { id: "s1", name: "CleanPro Solutions", category: "Services", subcategory: "Home & Garden", rating: 4.7, reviews: 203, location: "Johannesburg", price: "R450", priceUnit: "/session", description: "Professional deep cleaning, carpet washing, and post-construction cleanup.", verified: true, available: true },
  { id: "s2", name: "Bongani's Plumbing", category: "Services", subcategory: "Home & Garden", rating: 4.5, reviews: 167, location: "Soweto", price: "R350", priceUnit: "/callout", description: "Licensed plumber. Burst pipes, geyser repairs, bathroom installations.", verified: true, available: true },
  { id: "s3", name: "Glamour by Zintle", category: "Services", subcategory: "Health & Beauty", rating: 4.9, reviews: 289, location: "Cape Town", price: "R600", priceUnit: "/session", description: "Mobile beauty salon. Hair, nails, makeup for events and everyday.", verified: true, available: true },
  { id: "s4", name: "Chef Vusi Catering", category: "Services", subcategory: "Catering & Chefs", rating: 4.8, reviews: 134, location: "Durban", price: "R180", priceUnit: "/person", description: "Private chef and catering for weddings, parties, and corporate events.", verified: true, available: true },
  { id: "s5", name: "DJ Flame Entertainment", category: "Services", subcategory: "Events & Entertainment", rating: 4.6, reviews: 98, location: "Johannesburg", price: "R3,500", priceUnit: "/event", description: "Professional DJ, MC, and sound equipment hire for all events.", verified: true, available: true },
  { id: "s6", name: "GreenThumb Gardens", category: "Services", subcategory: "Home & Garden", rating: 4.4, reviews: 76, location: "Pretoria", price: "R280", priceUnit: "/visit", description: "Garden maintenance, landscaping, tree felling, and irrigation systems.", verified: true, available: true },
];

// ─── Mock Products ───
export const products: Product[] = [
  { id: "prod1", name: "Handcrafted Beaded Necklace", category: "Fashion & Accessories", price: 350, originalPrice: 450, image: "/placeholder.svg", seller: "Zulu Crafts", rating: 4.8, reviews: 45, inStock: true, description: "Traditional Zulu beadwork necklace, handmade with love." },
  { id: "prod2", name: "Samsung Galaxy A15", category: "Electronics & Tech", price: 4299, image: "/placeholder.svg", seller: "TechZone SA", rating: 4.5, reviews: 89, inStock: true, description: "128GB, Dual SIM, 5000mAh battery. Brand new with warranty." },
  { id: "prod3", name: "African Print Cushion Set", category: "Home & Living", price: 580, originalPrice: 750, image: "/placeholder.svg", seller: "Shweshwe Home", rating: 4.7, reviews: 32, inStock: true, description: "Set of 4 vibrant African print cushion covers. 45x45cm." },
  { id: "prod4", name: "Personalised Leather Journal", category: "Gifts & Handmade", price: 420, image: "/placeholder.svg", seller: "Craftsman Co", rating: 4.9, reviews: 67, inStock: true, description: "Hand-stitched genuine leather journal with custom name engraving." },
  { id: "prod5", name: "Nike Air Force 1", category: "Fashion & Accessories", price: 1899, image: "/placeholder.svg", seller: "Sneaker Republic", rating: 4.6, reviews: 156, inStock: false, description: "Classic white Nike Air Force 1 '07. Men's sizes 6-12." },
  { id: "prod6", name: "Wireless Earbuds Pro", category: "Electronics & Tech", price: 899, originalPrice: 1299, image: "/placeholder.svg", seller: "AudioSA", rating: 4.4, reviews: 78, inStock: true, description: "Active noise cancellation, 30hr battery, IPX5 water resistant." },
  { id: "prod7", name: "Rooibos Tea Gift Box", category: "Gifts & Handmade", price: 280, image: "/placeholder.svg", seller: "Cape Harvest", rating: 4.8, reviews: 23, inStock: true, description: "Premium organic rooibos collection. 6 flavours in gift packaging." },
  { id: "prod8", name: "Wooden Serving Board", category: "Home & Living", price: 650, image: "/placeholder.svg", seller: "Timber & Co", rating: 4.7, reviews: 41, inStock: true, description: "Hand-carved kiaat wood serving board. Perfect for entertaining." },
];

// ─── Categories for filters ───
export const serviceCategories = ["Transport", "Professionals", "Services"] as const;

export const serviceSubcategories: Record<string, string[]> = {
  Transport: ["Sedan & Hatchback", "Bakkie & LDV", "Shuttle & Minibus", "Bike Delivery"],
  Professionals: ["Legal Experts", "Medical Professionals", "Financial Services", "Engineering & Construction"],
  Services: ["Home & Garden", "Health & Beauty", "Catering & Chefs", "Events & Entertainment"],
};

export const shopCategories = ["Fashion & Accessories", "Electronics & Tech", "Home & Living", "Gifts & Handmade"] as const;

export const locations = ["Johannesburg", "Pretoria", "Cape Town", "Durban", "Soweto", "Sandton", "Stellenbosch"] as const;

// ─── Auth store (in-memory, simulates DB) ───
let currentUser: User | null = null;
const registeredUsers: User[] = [];

export const authStore = {
  register(data: { name: string; email: string; phone: string; password: string }): { success: boolean; error?: string; user?: User } {
    const exists = registeredUsers.find((u) => u.email === data.email);
    if (exists) return { success: false, error: "Email already registered" };
    const user: User = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: "customer",
      createdAt: new Date().toISOString(),
    };
    registeredUsers.push(user);
    currentUser = user;
    return { success: true, user };
  },
  login(email: string, password: string): { success: boolean; error?: string; user?: User } {
    // For demo, accept any registered email with any password, or use demo account
    const user = registeredUsers.find((u) => u.email === email);
    if (!user) {
      // Demo account
      if (email === "demo@mzansiserve.co.za") {
        const demoUser: User = { id: "usr_demo", name: "Demo User", email, phone: "0810001111", role: "customer", createdAt: new Date().toISOString() };
        currentUser = demoUser;
        return { success: true, user: demoUser };
      }
      return { success: false, error: "No account found with this email. Please register first." };
    }
    currentUser = user;
    return { success: true, user };
  },
  logout() { currentUser = null; },
  getUser() { return currentUser; },
};

// ─── Bookings store ───
const bookings: Booking[] = [];

export const bookingStore = {
  create(data: Omit<Booking, "id" | "status">): Booking {
    const booking: Booking = { ...data, id: `bk_${Date.now()}`, status: "pending" };
    bookings.push(booking);
    return booking;
  },
  getByUser(userId: string) { return bookings.filter((b) => b.userId === userId); },
  getAll() { return [...bookings]; },
  updateStatus(id: string, status: Booking["status"]) {
    const b = bookings.find((b) => b.id === id);
    if (b) b.status = status;
    return b;
  },
};

// ─── Cart store ───
export interface CartItem {
  product: Product;
  quantity: number;
}

let cart: CartItem[] = [];

export const cartStore = {
  add(product: Product, quantity = 1) {
    const existing = cart.find((i) => i.product.id === product.id);
    if (existing) { existing.quantity += quantity; }
    else { cart.push({ product, quantity }); }
  },
  remove(productId: string) { cart = cart.filter((i) => i.product.id !== productId); },
  update(productId: string, quantity: number) {
    const item = cart.find((i) => i.product.id === productId);
    if (item) item.quantity = Math.max(0, quantity);
    cart = cart.filter((i) => i.quantity > 0);
  },
  getAll() { return [...cart]; },
  getTotal() { return cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0); },
  getCount() { return cart.reduce((sum, i) => sum + i.quantity, 0); },
  clear() { cart = []; },
};
