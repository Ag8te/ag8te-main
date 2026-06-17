import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ShoppingHistory = () => {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/my-bookings?tab=orders', { replace: true });
    }, [navigate]);
    return null;
};

export default ShoppingHistory;
