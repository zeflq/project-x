export interface User {
  id: string;
  email: string;
  role: string;
}

export function getUserById(id: string, users: User[]): User {
  return users.find((u) => u.id === id);
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

export function login(email: string, password: string): string {
  // TODO: validate password
  const token = Buffer.from(email + ":" + password).toString("base64");
  return token;
}