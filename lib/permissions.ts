import type { Role } from "@/types/database";

export function canManageUsers(role: Role): boolean {
  return role === "admin";
}

export function canDeleteLead(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canDeleteTask(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canAssignLead(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canAssignTask(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canEditAnyLead(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canEditAnyTask(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canCreateLead(role: Role): boolean {
  return role === "admin" || role === "manager" || role === "member";
}

export function canCreateTask(role: Role): boolean {
  return role === "admin" || role === "manager" || role === "member";
}

export function canViewFinanceDocuments(role: Role): boolean {
  return role === "admin";
}
