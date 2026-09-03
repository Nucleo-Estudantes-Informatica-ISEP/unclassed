import * as userRepository from "@/application/repositories/userRepository";

export async function findUsersByIds(userIds: string[]) {
  return userRepository.findManyByIds(userIds);
}

export async function markOnboardingComplete(userId: string) {
  return userRepository.markOnboardingComplete(userId);
}
