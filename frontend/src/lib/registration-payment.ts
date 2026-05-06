type RegistrationPaymentUser = {
    role?: string | null;
    is_paid?: boolean | null;
};

export const requiresRegistrationPayment = (
    user: RegistrationPaymentUser | null | undefined
) => Boolean(user && user.role !== "client" && user.role !== "admin" && !user.is_paid);

export const isRegistrationPaymentAllowedPath = (pathname: string) => {
    const allowlist = [
        "/verify-email",
        "/payment-status",
        "/payment-error",
        "/forgot-password",
        "/reset-password",
    ];

    return allowlist.some((allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`));
};

export const buildRegistrationPaymentUrl = (from?: string) => {
    const params = new URLSearchParams({ status: "pending_payment" });

    if (from && from !== "/verify-email") {
        params.set("from", from);
    }

    return `/verify-email?${params.toString()}`;
};
