import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Register from "../Register";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

// Mock UI components that might cause issues in tests
vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

// Mock global fetch
vi.stubGlobal("fetch", vi.fn(async (url: string) => {
  console.log("Stubbed fetch called with:", url);
  if (url.includes("/api/public/payment-gateways")) {
    return {
      ok: true,
      json: async () => ({ success: true, data: { paypal: { enabled: true }, yoco: { enabled: true } } }),
    };
  }
  if (url.includes("/api/public/service-options")) {
    return {
      ok: true,
      json: async () => ({ success: true, data: { services: [] } }),
    };
  }
  return {
    ok: true,
    json: async () => ({ success: true, data: {} }),
  };
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    register: vi.fn().mockResolvedValue({ success: true }),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock URL methods for file previews
global.URL.createObjectURL = vi.fn(() => "test-url");
global.URL.revokeObjectURL = vi.fn();

const renderRegister = () => {
  return render(
    <BrowserRouter>
      <Register />
      <Toaster />
    </BrowserRouter>
  );
};

describe("Register Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    renderRegister();
    expect(screen.getByText(/Create your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Register as/i)).toBeInTheDocument();
  });

  it("shows validation errors on empty submission", async () => {
    renderRegister();
    const submitButton = screen.getByRole("button", { name: /(Create Account|Pay & Complete Registration)/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    });
  });

  it("updates field values correctly", () => {
    renderRegister();
    const nameInput = screen.getByPlaceholderText(/Thabo/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "John" } });
    expect(nameInput.value).toBe("John");
  });

  it("shows password strength indicator", () => {
    renderRegister();
    const passwordInput = screen.getByPlaceholderText(/Min 8 characters/i);
    fireEvent.change(passwordInput, { target: { value: "Weak" } });
    expect(screen.getByText(/Weak/i)).toBeInTheDocument();
    
    fireEvent.change(passwordInput, { target: { value: "StrongPassword123!" } });
    expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
  });

  it("uses country/region wording for nationality selection", () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/Register as/i), { target: { value: "driver" } });

    expect(screen.getByText(/Nationality \(country\/region\)/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Search country\/region/i })).toHaveAttribute(
      "placeholder",
      "Search country/region...",
    );
  });

  it("shows client personal fields without document uploads", () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/Register as/i), { target: { value: "client" } });

    expect(screen.getByPlaceholderText("Thabo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mokoena")).toBeInTheDocument();
    expect(screen.getByText(/Nationality \(country\/region\)/i)).toBeInTheDocument();
    expect(screen.getByText("Next of Kin")).toBeInTheDocument();
    expect(screen.queryByText("Verification Documents")).not.toBeInTheDocument();
    expect(screen.queryByText("Profile Photo")).not.toBeInTheDocument();
    expect(screen.queryByText("Certified ID Document / Passport")).not.toBeInTheDocument();
  });

  it("retains document uploads for provider registration", () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/Register as/i), { target: { value: "professional" } });

    expect(screen.getByText("Verification Documents")).toBeInTheDocument();
    expect(screen.getByText("Profile Photo")).toBeInTheDocument();
    expect(screen.getByText("Certified ID Document / Passport")).toBeInTheDocument();
  });
});
