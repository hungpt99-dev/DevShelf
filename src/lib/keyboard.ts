export interface EditableTarget {
  tagName?: string | null;
  isContentEditable?: boolean;
}

export function isEditableTarget(target: EditableTarget | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
