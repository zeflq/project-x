const API_BASE_URL = process.env.API_BASE_URL ?? "";

export interface Order {
  id: string;
  userId: string;
  items: string[];
  total: number;
  status: "pending" | "shipped" | "delivered";
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/orders?userId=${encodeURIComponent(userId)}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user orders. Status: ${response.status}`);
    }

    return (await response.json()) as Order[];
  } catch (error) {
    throw new Error(
      `Unable to fetch user orders: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function isEligibleForRefund(order: Order): boolean {
  return order.status === "delivered" && order.total > 0;
}

export async function cancelOrder(orderId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/cancel`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel order. Status: ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Unable to cancel order: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function fetchOrderById(orderId: string): Promise<Order> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch order. Status: ${response.status}`);
    }

    return (await response.json()) as Order;
  } catch (error) {
    throw new Error(
      `Unable to fetch order: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
