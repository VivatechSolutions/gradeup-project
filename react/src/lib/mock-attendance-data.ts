export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  photo: string;
  parentName: string;
  parentContact: string;
  academicPerformance: {
    math: number;
    science: number;
    english: number;
  };
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'leave' | 'half-day';
  checkIn?: string; // HH:MM
  checkOut?: string; // HH:MM
  remarks?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  document?: string;
}

const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
const formatYesterday = (date: Date) => date.toISOString().split('T')[0];

export const mockStudents: Student[] = [
  { id: 'S001', name: 'Aarav Sharma', rollNumber: '101', class: '10', section: 'A', photo: 'https://i.pravatar.cc/150?img=1', parentName: 'Mr. Rajesh Sharma', parentContact: '9876543210', academicPerformance: { math: 85, science: 90, english: 78 } },
  { id: 'S002', name: 'Vivaan Singh', rollNumber: '102', class: '10', section: 'A', photo: 'https://i.pravatar.cc/150?img=2', parentName: 'Mrs. Pooja Singh', parentContact: '9876543211', academicPerformance: { math: 92, science: 88, english: 95 } },
  { id: 'S003', name: 'Aditya Kumar', rollNumber: '103', class: '10', section: 'A', photo: 'https://i.pravatar.cc/150?img=3', parentName: 'Mr. Alok Kumar', parentContact: '9876543212', academicPerformance: { math: 70, science: 75, english: 80 } },
  { id: 'S004', name: 'Ishaan Patel', rollNumber: '104', class: '10', section: 'A', photo: 'https://i.pravatar.cc/150?img=4', parentName: 'Mrs. Seema Patel', parentContact: '9876543213', academicPerformance: { math: 78, science: 82, english: 70 } },
  { id: 'S005', name: 'Diya Gupta', rollNumber: '105', class: '10', section: 'A', photo: 'https://i.pravatar.cc/150?img=5', parentName: 'Mr. Manoj Gupta', parentContact: '9876543214', academicPerformance: { math: 95, science: 92, english: 88 } },
  { id: 'S006', name: 'Ananya Reddy', rollNumber: '106', class: '10', section: 'A', photo: 'https://i.pravatar.cc/150?img=6', parentName: 'Mrs. Kavita Reddy', parentContact: '9876543215', academicPerformance: { math: 60, science: 65, english: 70 } },
  { id: 'S007', name: 'Aryan Joshi', rollNumber: '201', class: '12', section: 'B', photo: 'https://i.pravatar.cc/150?img=7', parentName: 'Mr. Sanjay Joshi', parentContact: '9876543216', academicPerformance: { math: 88, science: 85, english: 90 } },
  { id: 'S008', name: 'Riya Malhotra', rollNumber: '202', class: '12', section: 'B', photo: 'https://i.pravatar.cc/150?img=8', parentName: 'Mrs. Neha Malhotra', parentContact: '9876543217', academicPerformance: { math: 75, science: 70, english: 72 } },
  { id: 'S009', name: 'Kabir Verma', rollNumber: '203', class: '12', section: 'B', photo: 'https://i.pravatar.cc/150?img=9', parentName: 'Mr. Vivek Verma', parentContact: '9876543218', academicPerformance: { math: 90, science: 93, english: 89 } },
  { id: 'S010', name: 'Myra Chauhan', rollNumber: '204', class: '12', section: 'B', photo: 'https://i.pravatar.cc/150?img=10', parentName: 'Mrs. Smita Chauhan', parentContact: '9876543219', academicPerformance: { math: 68, science: 72, english: 65 } },
];

export const mockAttendance: AttendanceRecord[] = [
  // Today's Attendance
  { studentId: 'S001', date: formatDate(today), status: 'present', checkIn: '09:00', checkOut: '16:00' },
  { studentId: 'S002', date: formatDate(today), status: 'present', checkIn: '09:02', checkOut: '16:05' },
  { studentId: 'S003', date: formatDate(today), status: 'absent' },
  { studentId: 'S004', date: formatDate(today), status: 'late', checkIn: '09:15', checkOut: '16:00' },
  { studentId: 'S005', date: formatDate(today), status: 'present', checkIn: '08:58', checkOut: '16:01' },
  { studentId: 'S006', date: formatDate(today), status: 'leave', remarks: 'Family function' },
  { studentId: 'S007', date: formatDate(today), status: 'present', checkIn: '09:00', checkOut: '16:00' },
  { studentId: 'S008', date: formatDate(today), status: 'half-day', checkIn: '09:00', checkOut: '12:30', remarks: 'Doctor appointment' },
  { studentId: 'S009', date: formatDate(today), status: 'present', checkIn: '09:05', checkOut: '16:00' },
  { studentId: 'S010', date: formatDate(today), status: 'absent' },

  // Yesterday's Attendance (example for history)
  { studentId: 'S001', date: formatYesterday(yesterday), status: 'present', checkIn: '09:01', checkOut: '16:00' },
  { studentId: 'S002', date: formatYesterday(yesterday), status: 'absent' },
  { studentId: 'S003', date: formatYesterday(yesterday), status: 'present', checkIn: '09:00', checkOut: '16:00' },
  { studentId: 'S004', date: formatYesterday(yesterday), status: 'present', checkIn: '09:00', checkOut: '16:00' },
  { studentId: 'S005', date: formatYesterday(yesterday), status: 'late', checkIn: '09:20', checkOut: '16:00' },
];

export const mockLeaveRequests: LeaveRequest[] = [
    { id: 'L001', studentId: 'S006', studentName: 'Ananya Reddy', class: '10', section: 'A', fromDate: formatDate(today), toDate: formatDate(today), reason: 'Family function', status: 'approved' },
    { id: 'L002', studentId: 'S010', studentName: 'Myra Chauhan', class: '12', section: 'B', fromDate: formatDate(today), toDate: formatDate(today), reason: 'Not feeling well', status: 'pending' },
    { id: 'L003', studentId: 'S001', studentName: 'Aarav Sharma', class: '10', section: 'A', fromDate: '2024-06-20', toDate: '2024-06-21', reason: 'Vacation', status: 'approved', document: 'vacation_request.pdf' },
    { id: 'L004', studentId: 'S005', studentName: 'Diya Gupta', class: '10', section: 'A', fromDate: '2024-06-18', toDate: '2024-06-18', reason: 'Doctor appointment', status: 'rejected' },
];
