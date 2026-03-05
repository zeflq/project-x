import { getUserById, isAdmin, type User } from "./auth.js";

export function deleteUser(requesterId: string, targetId: string, users: User[]): User[] {
  const requester = getUserById(requesterId, users);
  if (isAdmin(requester)) {
    return users.filter((u) => u.id !== targetId);
  }
  return users;
}

export function updateUserEmail(userId: string, newEmail: string, users: User[]): void {
  const user = getUserById(userId, users);
  user.email = newEmail;
}

export async function fetchUserProfile(userId: string): Promise<any> {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
}
