/** السجلات تُكتب من خادم Express فقط (الـ API الخلفي). */
export async function logAdminAction(
  action: string,
  entity: string,
  opts?: { entityId?: string | number | null; payload?: unknown },
): Promise<void> {
  void action;
  void entity;
  void opts;
}
