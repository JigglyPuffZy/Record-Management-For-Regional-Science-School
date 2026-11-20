import {
  LayoutDashboard,
  FileText,
  BookOpen,
  UserCircle,
  Settings,
  School,
  Users,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const STUDENT_NAV = [
  { to: '/student/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/student/sf10', label: 'SF10', icon: FileText },
  { to: '/student/academic-records', label: 'Records', icon: BookOpen },
  { to: '/student/profile', label: 'Profile', icon: UserCircle },
  { to: '/student/settings', label: 'Settings', icon: Settings },
];

export const TEACHER_NAV = [
  { to: '/teacher/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/teacher/classes', label: 'Classes', icon: School },
  { to: '/teacher/students', label: 'Students', icon: Users },
  { to: '/teacher/class-record', label: 'Grades', icon: ClipboardList },
  { to: '/teacher/academic-records', label: 'SF10', icon: GraduationCap },
];

export const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Overview', icon: ShieldCheck },
  { to: '/admin/registrations', label: 'Registrations', icon: UserCheck },
  { to: '/admin/accounts', label: 'Accounts', icon: Users },
];

export function getNavForRole(role) {
  if (role === 'admin') return ADMIN_NAV;
  return role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
}
