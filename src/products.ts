export async function getData(id: number): Promise<any> {
  const res = await fetch(`https://api.example.com/products/${id}`);
  const data = await res.json();
  return data;
}

export async function createProduct(name: string, price: number): Promise<any> {
  const res = await fetch("https://api.example.com/products", {
    method: "POST",
    body: JSON.stringify({ name, price }),
  });
  return res.json();
}
