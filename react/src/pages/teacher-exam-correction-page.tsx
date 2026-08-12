import React from 'react';
import ExamCorrectionDashboard from '../components/teacher/exam-correction/ExamCorrectionDashboard';
import TeacherLayout from '../components/TeacherLayout';

const TeacherExamCorrectionPage: React.FC = () => {
  return (
    <TeacherLayout showSidebar={false}>
      <ExamCorrectionDashboard />
    </TeacherLayout>
  );
};

export default TeacherExamCorrectionPage;
