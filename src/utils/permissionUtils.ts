import { Group, Member, UserAuthProfile } from '../types';
import { isPhoneMatch } from '../lib/firebase';

/**
 * Finds the matching Member in a Group for a given UserAuthProfile
 */
export function getLoggedInMember(group: Group, currentUser?: UserAuthProfile | null): Member | null {
  if (!currentUser) return null;
  return (
    group.members.find(
      (m) =>
        (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.mobileNumber &&
          (isPhoneMatch(m.phone, currentUser.mobileNumber) ||
            isPhoneMatch(m.mobileNumber, currentUser.mobileNumber))) ||
        (currentUser.name && m.name.toLowerCase() === currentUser.name.toLowerCase()) ||
        (currentUser.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
        (currentUser.name && currentUser.name.toLowerCase().includes(m.name.toLowerCase()))
    ) || null
  );
}

/**
 * Checks if a specific category/scope ID is permitted for a member
 */
export function isCategoryPermittedForMember(member: Member | null, categoryId: string): boolean {
  if (!member) return true; // default open if no specific member mapping
  const cats = member.includedCategories;
  if (!cats || cats.length === 0) return true; // default open if empty
  return cats.includes(categoryId);
}

/**
 * Checks if a specific category/scope ID is permitted for the currently logged in user
 */
export function isCategoryPermittedForUser(
  categoryId: string,
  group: Group,
  currentUser?: UserAuthProfile | null
): boolean {
  if (!currentUser || currentUser.role === 'admin') return true; // Admin has full access to all scopes
  const member = getLoggedInMember(group, currentUser);
  return isCategoryPermittedForMember(member, categoryId);
}

/**
 * Returns list of permitted category IDs for the currently logged in user
 */
export function getUserPermittedCategories(
  group: Group,
  currentUser?: UserAuthProfile | null
): string[] {
  if (!currentUser || currentUser.role === 'admin') {
    return ['mess', 'general', 'electricity', 'internet', 'water', 'gas', 'cleaner', 'rent'];
  }
  const member = getLoggedInMember(group, currentUser);
  if (!member || !member.includedCategories || member.includedCategories.length === 0) {
    return ['mess', 'general', 'electricity', 'internet', 'water', 'gas', 'cleaner', 'rent'];
  }
  return member.includedCategories;
}
