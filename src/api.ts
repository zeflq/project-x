export async function fetchData(url: string): Promise<any> {
  const res = await fetch(url);
  const data = await res.json();
  return data;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}
function calculateSum(a: number, b: number): number { 
  
}