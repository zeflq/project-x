export interface User {
  id: string;
  email: string;
  role: string;
}

export function getUserById(id: string, users: User[]): User | undefined {
  return users.find((user) => user.id === id);
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

export function login(email: string, password: string): string {
  const token = Buffer.from(`${email}:${password}`).toString("base64");
  return token;
}
