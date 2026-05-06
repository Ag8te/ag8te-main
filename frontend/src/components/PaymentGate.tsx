import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    buildRegistrationPaymentUrl,
    isRegistrationPaymentAllowedPath,
    requiresRegistrationPayment,
} from "@/lib/registration-payment";

interface PaymentGateProps {
    children: ReactNode;
}

const PaymentGate = ({ children }: PaymentGateProps) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading || !isAuthenticated || !requiresRegistrationPayment(user)) {
        return <>{children}</>;
    }

    if (isRegistrationPaymentAllowedPath(location.pathname)) {
        return <>{children}</>;
    }

    const from = `${location.pathname}${location.search || ""}`;
    return <Navigate to={buildRegistrationPaymentUrl(from)} replace />;
};

export default PaymentGate;
