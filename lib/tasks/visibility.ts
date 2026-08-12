/** Shared filter: tasks created by or assigned to this member (incl. multi-assignee). */
export function memberTaskOrFilter(memberId: string) {
  return `assigned_to.eq.${memberId},created_by.eq.${memberId},assignee_ids.cs.{${memberId}}`;
}
