export interface Order {
  id: string;
  userId: string;
  items: string[];
  total: number;
  status: "pending" | "shipped" | "delivered";
}

// violates: too generic, should be fetchOrders or fetchUserOrders
export async function getData(userId: string): Promise<Order[]> {
  const res = await fetch(`/api/orders?userId=${userId}`);
  return res.json();
}

// violates: should be isEligibleForRefund
export function checkRefund(order: Order): boolean {
  return order.status === "delivered" && order.total > 0;
}

// violates: should be cancelOrder, not handleCancel
export async function handleCancel(orderId: string): Promise<void> {
  await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
}

// ok: follows convention
export async function fetchOrderById(orderId: string): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`);
  return res.json();
}
