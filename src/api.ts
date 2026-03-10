export async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch data. Status: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    throw new Error(
      `Unable to fetch data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}
