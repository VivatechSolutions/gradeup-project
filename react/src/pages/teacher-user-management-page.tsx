import React from 'react';
import UserManagementDashboard from '../components/teacher/user-management/UserManagementDashboard';
import TeacherLayout from '../components/TeacherLayout';

const TeacherUserManagementPage: React.FC = () => {
  return (
    <TeacherLayout showSidebar={false}>
      <UserManagementDashboard />
    </TeacherLayout>
  );
};

export default TeacherUserManagementPage;
