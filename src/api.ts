export async function fetchData(url: string, retries = 3): Promise<any> {
  const res = await fetch(url);
  const data = await res.json();
  return data;
}

export async function postData(url: string, body: any): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}