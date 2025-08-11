// Frontend API helper for payment integration

const API_BASE_URL = "http://localhost:3000/api";

// Create MoMo payment for item purchase
export const createMoMoPayment = async (itemId, quantity = 1) => {
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/payment/momo/create-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        itemId,
        quantity,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Payment creation failed");
    }

    return data;
  } catch (error) {
    console.error("Create MoMo payment error:", error);
    throw error;
  }
};

// Verify payment status
export const verifyPayment = async (orderId) => {
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/payment/momo/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Payment verification failed");
    }

    return data;
  } catch (error) {
    console.error("Verify payment error:", error);
    throw error;
  }
};

// Get payment packages
export const getPaymentPackages = async () => {
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/payment/packages`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to get packages");
    }

    return data;
  } catch (error) {
    console.error("Get packages error:", error);
    throw error;
  }
};

// Get payment history
export const getPaymentHistory = async () => {
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/payment/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to get payment history");
    }

    return data;
  } catch (error) {
    console.error("Get payment history error:", error);
    throw error;
  }
};
