import * as userRepository from "@/application/repositories/userRepository";

export async function getPreferences(userId: string) {
  return userRepository.findPreferencesById(userId);
}

export async function updatePreferences(
  userId: string,
  updateData: Record<string, unknown>
) {
  return userRepository.updatePreferences(userId, updateData);
}
