/**
 * Dashboard locale resource — English.
 *
 * This file is the source of truth for the dashboard message keys: `ar.ts` is
 * typed against `keyof typeof dashboardEn`, so adding a key here without its
 * Arabic twin fails the build (bilingual-by-construction).
 *
 * Templates support `{placeholder}` interpolation via `formatMessage`.
 */
export const dashboardEn = {
  // ── Shell / layout ────────────────────────────────────────────────────────
  "shell.brandSub": "Dashboard",
  "shell.navAria": "Main navigation",
  "shell.openMenu": "Open menu",
  "shell.closeMenu": "Close menu",
  "shell.expandSidebar": "Expand sidebar",
  "shell.collapseSidebar": "Collapse sidebar",
  "shell.expand": "Expand",
  "shell.collapse": "Collapse",
  "shell.breadcrumbAria": "Breadcrumb",
  "shell.home": "Dashboard",
  "shell.builtForYou": "built for you",
  "shell.toggleLanguage": "Toggle language",
  "shell.profile": "Profile & password",
  "shell.signOut": "Sign out",

  // ── Topbar search / command palette ──────────────────────────────────────
  "search.placeholder": "Quick search…",
  "search.aria": "Search the dashboard",
  "search.shortcutHint": "Ctrl+K",
  "search.searching": "Searching…",
  "search.noResults": "No results for “{q}”",
  "search.minChars": "Type at least 2 characters",
  "search.error": "Search failed — try again",
  "search.products": "Products",
  "search.categories": "Categories",
  "search.brands": "Brands",
  "search.users": "Team members",
  "search.pages": "Pages",
  "palette.title": "Command palette",
  "palette.placeholder": "Search products, categories, brands, team… ",
  "palette.navigate": "to navigate",
  "palette.select": "to open",
  "palette.dismiss": "to dismiss",

  // ── Notifications bell ────────────────────────────────────────────────────
  "notifications.title": "Notifications",
  "notifications.aria": "Notifications",
  "notifications.unread": "{count} unread",
  "notifications.empty": "You're all caught up",
  "notifications.emptyHint": "New orders, stock alerts and reviews will show up here.",
  "notifications.error": "Couldn't load notifications",
  "notifications.errorHint": "The notifications service isn't available yet.",
  "notifications.markAllRead": "Mark all as read",
  "notifications.markRead": "Mark as read",
  "notifications.pendingReview": "{count} products pending review",
  "notifications.newComments": "{count} new product comments",
  "notifications.categoriesNoAttrs": "{count} categories without attributes",
  "notifications.refresh": "Refresh",

  // ── Table / pagination ────────────────────────────────────────────────────
  "table.empty": "No records found",
  "table.selectAll": "Select all rows",
  "table.selectRow": "Select row",
  "table.sortAsc": "sorted ascending",
  "table.sortDesc": "sorted descending",
  "table.sortBy": "Sort by {column}",
  "table.selectedCount": "{count} selected",
  "table.clearSelection": "Clear selection",
  "pagination.rangeOf": "{from}–{to} of {total}",
  "pagination.first": "First page",
  "pagination.previous": "Previous page",
  "pagination.next": "Next page",
  "pagination.last": "Last page",
  "pagination.perPage": "per page",
  "pagination.page": "Page {page} of {pages}",

  // ── Dialogs / drawers / toasts ────────────────────────────────────────────
  "dialog.close": "Close",
  "confirm.title": "Are you sure?",
  "confirm.confirm": "Confirm",
  "confirm.cancel": "Cancel",
  "confirm.delete": "Delete",
  "toast.dismiss": "Dismiss",
  "drawer.close": "Close panel",

  // ── Generic ───────────────────────────────────────────────────────────────
  "common.loading": "Loading…",
  "common.retry": "Retry",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.search": "Search",
  "common.clear": "Clear",
  "common.viewAll": "View all",
  "common.noData": "Nothing here yet",
  "common.justNow": "just now",
} as const;

export type DashboardMessageKey = keyof typeof dashboardEn;
