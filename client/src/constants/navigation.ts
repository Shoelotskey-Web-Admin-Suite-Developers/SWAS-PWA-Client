export type NavPage =
  | 'serviceRequest'
  | 'operations'
  | 'payment'
  | 'central-view'
  | 'customer-information'
  | 'branches'
  | 'analytics'
  | 'appointments'
  | 'announcements'

export type PageHeaderMeta = {
  title: string
  subtitle: string
}

export type NavItem = {
  id: NavPage
  label: string
  icon: string
  visibilityKey: 'showServiceRequest' | 'showOperations' | 'showPayments' | 'showDatabaseView' | 'showAnalytics' | 'showUserManagement' | 'showNotifSheet'
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'serviceRequest', label: 'Service Request', icon: 'bi-receipt-cutoff', visibilityKey: 'showServiceRequest' },
  { id: 'operations', label: 'Operations', icon: 'bi-truck', visibilityKey: 'showOperations' },
  { id: 'payment', label: 'Payments', icon: 'bi-credit-card', visibilityKey: 'showPayments' },
  { id: 'central-view', label: 'Central View', icon: 'bi-database', visibilityKey: 'showDatabaseView' },
  { id: 'customer-information', label: 'Customers', icon: 'bi-person-lines-fill', visibilityKey: 'showDatabaseView' },
  { id: 'branches', label: 'Branches', icon: 'bi-shop-window', visibilityKey: 'showDatabaseView' },
  { id: 'analytics', label: 'Analytics', icon: 'bi-bar-chart-line', visibilityKey: 'showAnalytics' },
  { id: 'appointments', label: 'Appointments', icon: 'bi-calendar4-week', visibilityKey: 'showUserManagement' },
  { id: 'announcements', label: 'Announcements', icon: 'bi-megaphone', visibilityKey: 'showUserManagement' },
]

export const PAGE_HEADER_META: Record<NavPage, PageHeaderMeta> = {
  serviceRequest: {
    title: 'Service Request',
    subtitle: 'Create and manage new customer requests',
  },
  operations: {
    title: 'Operations',
    subtitle: 'Track day-to-day workflows and service queues',
  },
  payment: {
    title: 'Payments',
    subtitle: 'Review collections, balances, and settlement status',
  },
  'central-view': {
    title: 'Central View',
    subtitle: 'Inspect records across branches and customers',
  },
  'customer-information': {
    title: 'Customers',
    subtitle: 'Maintain customer profiles and contact details',
  },
  branches: {
    title: 'Branches',
    subtitle: 'Manage branch locations and configuration',
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Review performance trends and business insights',
  },
  appointments: {
    title: 'Appointments',
    subtitle: 'Monitor bookings, schedules, and assigned staff',
  },
  announcements: {
    title: 'Announcements',
    subtitle: 'Publish updates for staff and branch teams',
  },
}