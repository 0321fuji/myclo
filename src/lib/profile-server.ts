import { prisma } from "./prisma";
import type { UserProfileData } from "./profile";

/**
 * サーバー側でプロフィールを取得（API routeから使用）
 */
export async function getProfileForUser(userId: string): Promise<UserProfileData | null> {
  const p = await prisma.userProfile.findUnique({ where: { userId } });
  if (!p) return null;
  return {
    gender: p.gender as UserProfileData["gender"],
    ageGroup: p.ageGroup as UserProfileData["ageGroup"],
    height: p.height,
    bodyType: p.bodyType as UserProfileData["bodyType"],
    personalColor: p.personalColor as UserProfileData["personalColor"],
    preferredStyles: JSON.parse(p.preferredStyles || "[]"),
    dislikedStyles: JSON.parse(p.dislikedStyles || "[]"),
    inspirations: p.inspirations,
    occupation: p.occupation as UserProfileData["occupation"],
    scenes: JSON.parse(p.scenes || "[]"),
    avoid: p.avoid,
  };
}
