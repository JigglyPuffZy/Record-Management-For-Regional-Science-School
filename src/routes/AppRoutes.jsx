import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import Login from '../pages/auth/Login.jsx';

import StudentDashboard from '../pages/student/Dashboard.jsx';
import StudentSF10 from '../pages/student/SF10.jsx';
import StudentAcademicRecords from '../pages/student/AcademicRecords.jsx';
import StudentProfile from '../pages/student/Profile.jsx';
import StudentSettings from '../pages/student/Settings.jsx';

import TeacherDashboard from '../pages/teacher/Dashboard.jsx';
import TeacherClasses from '../pages/teacher/Classes.jsx';
import TeacherClassDetail from '../pages/teacher/ClassDetail.jsx';
import TeacherStudents from '../pages/teacher/Students.jsx';
import TeacherCreateStudent from '../pages/teacher/CreateStudent.jsx';
import TeacherStudentDetail from '../pages/teacher/StudentDetail.jsx';
import TeacherClassRecord from '../pages/teacher/ClassRecord.jsx';
import TeacherAcademicRecords from '../pages/teacher/AcademicRecords.jsx';
import TeacherProfile from '../pages/teacher/Profile.jsx';
import TeacherSettings from '../pages/teacher/Settings.jsx';

function RootRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute role="student" />}>
        <Route element={<AppLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/sf10" element={<StudentSF10 />} />
          <Route path="/student/academic-records" element={<StudentAcademicRecords />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/settings" element={<StudentSettings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="teacher" />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/classes/:classId" element={<TeacherClassDetail />} />
          <Route path="/teacher/students" element={<TeacherStudents />} />
          <Route path="/teacher/students/create" element={<TeacherCreateStudent />} />
          <Route path="/teacher/students/:studentId" element={<TeacherStudentDetail />} />
          <Route path="/teacher/class-record" element={<TeacherClassRecord />} />
          <Route path="/teacher/academic-records" element={<TeacherAcademicRecords />} />
          <Route path="/teacher/profile" element={<TeacherProfile />} />
          <Route path="/teacher/settings" element={<TeacherSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
