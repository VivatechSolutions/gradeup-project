import {
  mockStudentAnalytics,
  mockClassAnalytics,
  mockDashboardAnalytics,
  StudentAnalytics,
  ClassAnalytics,
  DashboardAnalytics,
} from './mock-user-management-data';

const api = {
  getDashboardAnalytics: (): Promise<DashboardAnalytics> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(mockDashboardAnalytics), 500);
    });
  },

  getAllStudentAnalytics: (): Promise<StudentAnalytics[]> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(mockStudentAnalytics), 800);
    });
  },

  getStudentAnalyticsById: (studentId: string): Promise<StudentAnalytics | undefined> => {
    return new Promise(resolve => {
      const student = mockStudentAnalytics.find(s => s.id === studentId);
      setTimeout(() => resolve(student), 300);
    });
  },

  getAllClassAnalytics: (): Promise<ClassAnalytics[]> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(mockClassAnalytics), 600);
    });
  },

  getClassAnalytics: (className: string, section: string): Promise<ClassAnalytics | undefined> => {
     return new Promise(resolve => {
      const classData = mockClassAnalytics.find(c => c.class === className && c.section === section);
      setTimeout(() => resolve(classData), 400);
    });
  },
};

export default api;
