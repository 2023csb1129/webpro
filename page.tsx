'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  loginAction,
  getSessionAction,
  logoutAction,
  createSemester,
  deleteSemester,
  getPendingRegistrations,
  handleRegistration,
  getSemesters,
  getDepartments,
  createDepartment,
  deleteDepartment,
  getDegrees,
  createDegree,
  dissolveDegree,
  getDeptDegreeMatrix,
  addDegreeToDept,
  removeDegreeFromDept,
  getPeople, 
  addStudent, 
  addInstructor, 
  updateUserStatus,
  batchUpdateUserStatus,
  batchImportStudents,
  createCourse,
  getCourses,
  deleteCourseCategory,
  createCourseCategory,
  getCourseCategories,
  getAvailableNumbers,
  getActiveSemesters,
  getInstructorProfile,
  getMyRegistrations,
  getStudentProfile,
  registerForSemester,
  getSystemStats,
  toggleSemesterStatus,
  getOpenCourses,
  openCourseForSemester,
  closeCourseForSemester,
  getSemesterCourses,
  submitFeesAndRegister,
  getFeeDetails,
  getMyFeeHistory,
  enrollStudentInCourse,
  getMyEnrolledCourses,
  getAvailableOpenCourses,
  getInstructorAssignments,
  getAvailableTeachingSlots,
  requestToTeach,
  requestEnrollment,
  approveStudentEnrollment,
  approveTeachingRequest,
  getTeachingRequests,
  handleTeachingRequest,
  getInstructorPendingStudents,
  rejectEnrollment,
  getCourseRoster,
  updateStudentGrade,
  getStudentRecord,
  advisorApproveEnrollment,
  getAdvisedStudents,
  getAdvisorPendingRequests
} from './actions';

// Place this at the top level of page.tsx
const getSemesterDisplayName = (sem: any) => {
  if (!sem) return 'Unknown Semester';
  const y1 = sem.year1;
  const y2 = y1 + 1;
  
  // Checks based on your schema's sem_no logic
  if (sem.sem_no === 1) return `I Semester of AY ${y1}-${y2.toString().slice(-2)}`;
  if (sem.sem_no === 2) return `II Semester of AY ${y1}-${y2.toString().slice(-2)}`;
  if (sem.sem_no === 3) return `Summer Semester ${y2}`;
  
  // Fallback for custom labels
  return sem.custom_label || sem.sem_id;
};

function InstructorRosterTab({ instructorId }: { instructorId: string }) {
  // --- DATA STATE ---
  const [runningCourses, setRunningCourses] = useState<any[]>([]);
  const [selectedAsgn, setSelectedAsgn] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load instructor's assigned courses with 'status: 1'
  const loadRunning = async () => {
    const data = await getInstructorAssignments(instructorId);
    setRunningCourses(data.filter((a: any) => a.status === 1));
  };

  useEffect(() => { loadRunning(); }, []);

  // Fetch the roster for the selected course
  useEffect(() => {
    if (selectedAsgn) {
      setLoading(true);
      getCourseRoster(selectedAsgn.course_id, selectedAsgn.sem_id).then(data => {
        setRoster(data || []);
        setLoading(false);
      });
    }
  }, [selectedAsgn]);

  // Combined Handler: Updates Grade and Points
  const handleGradeChange = async (studId: string, grade: string) => {
    const res = await updateStudentGrade(
      studId, 
      selectedAsgn.course_id, 
      selectedAsgn.sem_id, 
      grade
    );

    if (res.success) {
      // Refresh local roster to show updated values
      setRoster(prev => prev.map(s => s.stud_id === studId ? { ...s, grade } : s));
    } else {
      alert("System Error: " + res.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in pb-20">
      
      {/* SIDEBAR: ACTIVE COURSE SELECTION */}
      <div className="lg:col-span-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-8">
          <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em] mb-4 ml-1">Running Sections</h3>
          <div className="space-y-2">
            {runningCourses.map(asgn => (
              <button
                key={`${asgn.course_id}-${asgn.sem_id}`}
                onClick={() => setSelectedAsgn(asgn)}
                className={`w-full text-left p-5 rounded-[1.8rem] border transition-all active:scale-[0.98] ${
                  selectedAsgn?.course_id === asgn.course_id && selectedAsgn?.sem_id === asgn.sem_id
                    ? 'bg-slate-900 border-slate-900 shadow-xl'
                    : 'bg-white border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedAsgn?.course_id === asgn.course_id ? 'text-blue-400' : 'text-slate-400'}`}>
                  {asgn.sem_id}
                </div>
                <div className={`font-bold text-sm leading-tight ${selectedAsgn?.course_id === asgn.course_id ? 'text-white' : 'text-slate-700'}`}>
                  {asgn.courses?.title}
                </div>
              </button>
            ))}
            {runningCourses.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No assigned courses.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN: ROSTER & GRADE ENTRY */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Official Gradebook</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                {selectedAsgn ? `${selectedAsgn.course_id} | ${selectedAsgn.courses?.title}` : 'Select a section to begin grading'}
              </p>
            </div>
          </div>

          <div className="flex-1">
            {selectedAsgn ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/20">
                    <tr>
                      <th className="px-8 py-5">Student</th>
                      <th className="px-8 py-5">Dept</th>
                      <th className="px-8 py-5 text-right">Grade Entry</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {roster.map(row => {
                      const isEnrolled = row.status === 2; // FIXED: Logic check for full enrollment
                      const isPendingAdvisor = row.status === 1; //
                      
                      return (
                        <tr 
                          key={row.stud_id} 
                          className={`transition-all group ${
                            !isEnrolled 
                              ? 'bg-slate-50/50 opacity-80' // Visual indicator for locked rows
                              : 'hover:bg-slate-50/50' 
                          }`}
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-black text-slate-800">{row.students?.first_name} {row.students?.last_name}</div>
                                <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{row.stud_id}</div>
                              </div>
                              {isPendingAdvisor && (
                                <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-200">
                                  Awaiting Advisor
                                </span>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-black text-slate-500 uppercase">{row.students?.dept_id}</span>
                          </td>

                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end items-center gap-3">
                              {!isEnrolled && (
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
                                  Locked
                                </span>
                              )}
                              <select
                                value={row.grade || ''}
                                // FIXED: Only allow interaction if status is 2 (Fully Enrolled)
                                disabled={!isEnrolled} 
                                onChange={(e) => handleGradeChange(row.stud_id, e.target.value)}
                                className={`border rounded-xl px-4 py-2 text-[11px] font-black outline-none shadow-sm transition-all ${
                                  !isEnrolled 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500'
                                }`}
                              >
                                <option value="">N/A</option>
                                {['A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'F', 'E', 'W'].map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                <div className="text-4xl mb-4 grayscale opacity-20">📖</div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] leading-loose">Select a running course <br/> to access the roster.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InstructorAdvisorTab({ instructorId }: { instructorId: string }) {
  const [advisees, setAdvisees] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdvisorData = async () => {
    setLoading(true);
    const [students, reqs] = await Promise.all([
      getAdvisedStudents(instructorId),
      getAdvisorPendingRequests(instructorId)
    ]);
    setAdvisees(students);
    setPendingRequests(reqs);
    setLoading(false);
  };

  const loadRequests = async () => {
    setLoading(true);
    const data = await getAdvisorPendingRequests(instructorId);
    setPendingRequests(data);
    setLoading(false);
  };

  useEffect(() => { loadAdvisorData(); }, []);

  const handleFinalApproval = async (studId: string, courseId: string, semId: string) => {
    const res = await advisorApproveEnrollment(studId, courseId, semId);
    if (res.success) {
      loadRequests(); // Refresh the queue
    } else {
      alert(res.message);
    }
  };

  if (loading) return <div className="py-20 text-center animate-pulse text-[10px] font-black text-slate-400 uppercase">Synchronizing Advisory Data...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in pb-20">
      
      {/* SECTION 1: VERIFICATION QUEUE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b bg-amber-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-amber-800 text-sm uppercase tracking-widest">Advisor Verification Queue</h3>
            <p className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">Finalize registrations already approved by course instructors</p>
          </div>
          <span className="bg-white px-4 py-1.5 rounded-full border border-amber-200 text-[10px] font-black text-amber-600">
            {pendingRequests.length} PENDING ACTION
          </span>
        </div>
        
        <div className="p-6 space-y-4">
          {pendingRequests.map((req) => (
            <div key={`${req.stud_id}-${req.course_id}-${req.sem_id}`} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center group hover:border-amber-200 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase">{req.sem_id}</span>
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 rounded uppercase border border-blue-100">{req.course_id}</span>
                </div>
                <h4 className="text-lg font-black text-slate-800 leading-tight">{req.students?.first_name} {req.students?.last_name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.courses?.title}</p>
              </div>
              
              <button 
                onClick={() => handleFinalApproval(req.stud_id, req.course_id, req.sem_id)}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all"
              >
                Verify & Finalize
              </button>
            </div>
          ))}
          {pendingRequests.length === 0 && (
            <div className="py-20 text-center text-slate-300 italic font-black text-[10px] uppercase tracking-[0.3em]">
              Your verification queue is empty
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: ADVISEE DIRECTORY */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Assigned Advisees</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase">{advisees.length} Total Students</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Entry No</th>
                <th className="px-8 py-5">Student Name</th>
                <th className="px-8 py-5">Department & Program</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {advisees.map((s) => (
                <tr key={s.stud_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-mono font-bold text-slate-500">{s.stud_id}</td>
                  <td className="px-8 py-5 font-black text-slate-800">{s.first_name} {s.last_name || ''}</td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{s.departments?.dept_name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{s.degrees?.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-green-100">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InstructorPortal({ user, onLogout }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [activeSemesters, setActiveSemesters] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);

  useEffect(() => { 
    getInstructorProfile(user.ins_id).then(setProfile);
    getSemesters().then(setActiveSemesters);
    getMyRegistrations(user.ins_id).then(setMyRegistrations); 
  }, []);

  if (!profile) return <div className="h-screen flex items-center justify-center text-slate-400">Loading Faculty Profile...</div>;

  return (
    <DashboardLayout 
      user={user} role="instructor" onLogout={onLogout} 
      tabs={[
        {id: 'dashboard', label: 'Dashboard'},
        {id: 'courses', label: 'Courses & Approvals'},      // Teaching Requests Tab
        {id: 'my-courses', label: 'My Courses & Grades'}, // Grading & Roster Tab
        {id: 'student-records', label: 'Student Records'},
        {id: 'advisor', label: 'Advisor Roles'}
      ]}
    >
      <InstructorContent 
        profile={profile} 
        semesters={activeSemesters} 
        myRegistrations={myRegistrations} 
      /> 
    </DashboardLayout>
  );
}

function InstructorStudentRecordsTab() {
  // --- DATA STATE ---
  const [students, setStudents] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [degrees, setDegrees] = useState<any[]>([]);
  
  // --- UI STATE ---
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [studentRecord, setStudentRecord] = useState<any[]>([]);

  // --- FILTER STATE (Mirrors ManagePeopleContent) ---
  const [filterName, setFilterName] = useState('');
  const [filterID, setFilterID] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDeg, setFilterDeg] = useState('');

  useEffect(() => {
    const loadInitData = async () => {
      const [p, d, deg] = await Promise.all([getPeople(), getDepartments(), getDegrees()]);
      setStudents(p.students || []);
      setDepts(d || []);
      setDegrees(deg || []);
    };
    loadInitData();
  }, []);

  // --- HANDLER: VIEW SPECIFIC RECORD ---
  const handleViewRecord = async (student: any) => {
    setLoadingRecord(true);
    setSelectedStudent(student);
    const data = await getStudentRecord(student.stud_id);
    setStudentRecord(data || []);
    setLoadingRecord(false);
  };

  // --- FILTER LOGIC ---
  const displayedList = students.filter(i => {
    const matchName = filterName ? `${i.first_name} ${i.last_name}`.toLowerCase().includes(filterName.toLowerCase()) : true;
    const matchID = filterID ? i.stud_id.toLowerCase().includes(filterID.toLowerCase()) : true;
    const matchYear = filterYear ? i.stud_id.startsWith(filterYear) : true;
    const matchDept = filterDept ? i.dept_id === filterDept : true;
    const matchDeg = filterDeg ? i.deg_id === filterDeg : true;
    return matchName && matchID && matchYear && matchDept && matchDeg;
  });

  // --- RENDER VIEW 1: TRANSCRIPT ---
  if (selectedStudent) {
    return (
      <div className="animate-in slide-in-from-right-4 duration-500">
        <button 
          onClick={() => setSelectedStudent(null)}
          className="mb-6 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
        >
          ← Back to Directory
        </button>
        
        {/* Reusing Transcript Header Logic */}
        <div className="mb-10">
          <UserProfileHeader profile={selectedStudent} role="student" />
        </div>

        {loadingRecord ? (
          <div className="py-20 text-center animate-pulse text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Fetching Academic Files...
          </div>
        ) : (
          <StudentRecordInnerView records={studentRecord} />
        )}
      </div>
    );
  }

  // --- RENDER VIEW 2: DIRECTORY ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Student Directory</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Search and monitor academic records</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <input placeholder="Search Name..." className="w-full px-4 py-2.5 border rounded-xl text-sm" value={filterName} onChange={e => setFilterName(e.target.value)} />
          <input placeholder="Entry No / ID..." className="w-full px-4 py-2.5 border rounded-xl text-sm font-mono" value={filterID} onChange={e => setFilterID(e.target.value)} />
          <input type="number" placeholder="Year (YYYY)..." className="w-full px-4 py-2.5 border rounded-xl text-sm font-mono" value={filterYear} onChange={e => setFilterYear(e.target.value)} />
          <select className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Depts</option>
            {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
          </select>
          <select className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white" value={filterDeg} onChange={e => setFilterDeg(e.target.value)}>
            <option value="">All Degrees</option>
            {degrees.map(d => <option key={d.deg_id} value={d.deg_id}>{d.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Entry No</th>
                <th className="px-8 py-5">Full Name</th>
                <th className="px-8 py-5">Affiliation</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedList.map((item) => (
                <tr key={item.stud_id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5 font-mono font-bold text-slate-700">{item.stud_id}</td>
                  <td className="px-8 py-5 font-black text-slate-800">{item.first_name} {item.last_name || ''}</td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-[10px] text-slate-600 uppercase">{item.departments?.dept_name}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{item.degrees?.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleViewRecord(item)}
                      className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-slate-900 transition-all active:scale-95"
                    >
                      View Record
                    </button>
                  </td>
                </tr>
              ))}
              {displayedList.length === 0 && (
                <tr><td colSpan={4} className="p-20 text-center text-slate-300 italic font-black text-[10px] uppercase tracking-[0.3em]">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentRecordInnerView({ records }: { records: any[] }) {
  const semestersMap = records.reduce((acc: any, curr: any) => {
    const semId = curr.sem_id;
    if (!acc[semId]) acc[semId] = { info: curr.semesters, courses: [] };
    acc[semId].courses.push(curr);
    return acc;
  }, {});

  const chronoSems = Object.keys(semestersMap).sort();

  let totalCgpaPoints = 0;
  let totalCgpaCredits = 0;
  let cumulEarnedCredits = 0;

  return (
    <div className="space-y-8">
      {chronoSems.map((semId) => {
        const semData = semestersMap[semId];
        let semSgpaPoints = 0;
        let semSgpaCredits = 0;
        let semEarnedCredits = 0;
        let semRegCredits = 0;

        // FIXED: Filter only for status 2 (Advisor Approved)
        const approvedCourses = semData.courses.filter((c: any) => c.status === 2);

        approvedCourses.forEach((c: any) => {
          const credits = parseFloat(c.courses?.credits || 0);
          const gp = parseFloat(c.grade_points || 0);
          const grade = c.grade;

          if (grade) {
            semRegCredits += credits;
            if (grade !== 'W') {
              semSgpaPoints += (credits * gp);
              semSgpaCredits += credits;
              
              if (grade !== 'E' && grade !== 'F') {
                semEarnedCredits += credits;
                totalCgpaPoints += (credits * gp);
                totalCgpaCredits += credits;
              }
            }
          }
        });

        cumulEarnedCredits += semEarnedCredits;
        const sgpa = semSgpaCredits > 0 ? (semSgpaPoints / semSgpaCredits).toFixed(2) : "0.00";
        const cgpa = totalCgpaCredits > 0 ? (totalCgpaPoints / totalCgpaCredits).toFixed(2) : "0.00";

        return (
          <div key={semId} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="bg-slate-900 px-6 py-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-[10px] font-black uppercase tracking-widest text-white">
              <span className="text-blue-400">Academic session: {semId}</span>
              <span>SGPA: <span className="text-blue-400">{sgpa}</span></span>
              <span>Credits registered: {semRegCredits}</span>
              <span>Earned Credits: {semEarnedCredits}</span>
              <span>Cumul. Earned Credits: {cumulEarnedCredits}</span>
              <span className="ml-auto">CGPA: <span className="text-emerald-400">{cgpa}</span></span>
            </div>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-50">
                {approvedCourses.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-300 italic">No advisor-approved courses for this semester.</td>
                  </tr>
                ) : (
                  approvedCourses.map((c: any, idx: number) => (
                    <tr key={c.course_id}>
                      <td className="px-6 py-4 w-12 text-slate-300 font-mono">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{c.course_id} - {c.courses?.title}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400 font-black uppercase text-[9px]">Credit</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-black ${c.grade === 'F' || c.grade === 'E' ? 'text-red-500' : 'text-slate-700'}`}>
                          {c.grade || '--'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function InstructorContent({ profile, activeTab, semesters, myRegistrations }: any) { 
  if (activeTab === 'courses') {
    return <InstructorCoursesTab instructorId={profile.ins_id} semesters={semesters} myRegistrations={myRegistrations} />;
  }
  if (activeTab === 'my-courses') {
    return <InstructorRosterTab instructorId={profile.ins_id} />;
  }
  // NEW DISPATCHER
  if (activeTab === 'advisor') {
    return <InstructorAdvisorTab instructorId={profile.ins_id} />;
  }
  if (activeTab === 'student-records') {
    return <InstructorStudentRecordsTab />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <UserProfileHeader profile={profile} role="instructor" />
      <ActiveSemestersSection userId={profile.ins_id} role="instructor" />
    </div>
  );
}

function InstructorCoursesTab({ instructorId, semesters = [], myRegistrations = [] }: any) {
  // --- UI & DATA STATE ---
  const [selectedSem, setSelectedSem] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [studentRequests, setStudentRequests] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<'history' | 'requests'>('history');
  const [loading, setLoading] = useState(false);

  // --- FILTERS ---
  const [showPending, setShowPending] = useState(true);
  const [showRunning, setShowRunning] = useState(true);

  // 1. CRITICAL LOADING GUARD: Fixes "Cannot read properties of undefined (reading 'map')"
  // This ensures we don't process logic until data arrays exist.
  if (!semesters || !myRegistrations) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="text-3xl mb-4">⏳</div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Establishing Secure Session...</p>
      </div>
    );
  }

  // --- GATEKEEPER LOGIC ---
  const approvedSemIds = new Set(myRegistrations.filter((r: any) => r.registration_status === 1).map((r: any) => r.semester_id));
  const pendingSemIds = new Set(myRegistrations.filter((r: any) => r.registration_status === 0).map((r: any) => r.semester_id));
  const registeredSemesters = semesters.filter((s: any) => approvedSemIds.has(s.sem_id));

  const loadData = async () => {
    const [assignments, requests] = await Promise.all([
      getInstructorAssignments(instructorId),
      getInstructorPendingStudents(instructorId)
    ]);
    setMyAssignments(assignments);
    setStudentRequests(requests);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedSem) {
      setLoading(true);
      getAvailableTeachingSlots(selectedSem, instructorId).then(data => {
        setAvailableSlots(data);
        setLoading(false);
      });
    }
  }, [selectedSem]);

  const handleRequest = async (courseId: string) => {
    const res = await requestToTeach(instructorId, courseId, selectedSem);
    if (res.success) { alert(res.message); loadData(); }
    else alert(res.message);
  };

  const onStudentDecision = async (studId: string, courseId: string, semId: string, action: 'approve' | 'reject') => {
    const res = action === 'approve' 
      ? await approveStudentEnrollment(studId, courseId, semId)
      : await rejectEnrollment(studId, courseId, semId);
    if (res.success) loadData();
    else alert(res.message);
  };

  const filteredAssignments = myAssignments.filter(asgn => {
    if (asgn.status === 0 && showPending) return true;
    if (asgn.status === 1 && showRunning) return true;
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in pb-20">
      
      {/* LEFT: REQUEST NEW COURSE */}
      <div className="lg:col-span-5">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-8 min-h-[400px] flex flex-col">
          <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight mb-6 text-center">Request Course</h3>
          {registeredSemesters.length > 0 ? (
            <div className="space-y-6">
              <select 
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none" 
                value={selectedSem} 
                onChange={(e) => setSelectedSem(e.target.value)}
              >
                <option value="">Choose Approved Sem...</option>
                {registeredSemesters.map((s: any) => (
                  <option key={s.sem_id} value={s.sem_id}>{getSemesterDisplayName(s)}</option>
                ))}
              </select>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {availableSlots.map(slot => (
                  <div key={slot.course_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white transition-all">
                    <div className="flex-1">
                      <div className="text-[10px] font-black text-purple-600 font-mono">{slot.course_id}</div>
                      <div className="font-bold text-slate-700 text-sm">{slot.courses?.title}</div>
                    </div>
                    <button 
                      onClick={() => handleRequest(slot.course_id)} 
                      className="bg-purple-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-md transition-all active:scale-95"
                    >
                      Request
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 px-6 border-2 border-dashed border-slate-100 rounded-3xl">
              <div className="text-3xl grayscale opacity-50">🔒</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                {pendingSemIds.size > 0 
                  ? "Registration Pending: Awaiting Admin Approval" 
                  : "Access Denied: Please register for an active semester on the Dashboard first."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: HISTORY & STUDENT REQUESTS */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button onClick={() => setHistoryTab('history')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${historyTab === 'history' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-500'}`}>History</button>
              <button onClick={() => setHistoryTab('requests')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${historyTab === 'requests' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-500'}`}>Students ({studentRequests.length})</button>
            </div>
            {historyTab === 'history' && (
              <div className="flex items-center gap-6 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showPending} onChange={() => setShowPending(!showPending)} className="w-4 h-4 rounded text-amber-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Pending</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showRunning} onChange={() => setShowRunning(!showRunning)} className="w-4 h-4 rounded text-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Running</span>
                </label>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50/20 flex-1">
            {historyTab === 'history' ? (
              <div className="space-y-4">
                {filteredAssignments.map((asgn: any) => (
                  <div key={`${asgn.course_id}-${asgn.sem_id}`} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{getSemesterDisplayName(asgn.semesters)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${asgn.status === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {asgn.status === 1 ? 'Running' : 'Pending'}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-800 leading-tight">{asgn.courses?.title}</h4>
                      <div className="text-xs font-mono font-bold text-blue-600 uppercase tracking-tighter">{asgn.course_id}</div>
                    </div>
                  </div>
                ))}
                {filteredAssignments.length === 0 && (
                  <div className="py-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">No matching assignments</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {studentRequests.map((req) => (
                  <div key={`${req.stud_id}-${req.course_id}`} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{req.sem_id}</span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 rounded uppercase border border-blue-100">{req.course_id}</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-800 leading-tight">{req.students?.first_name} {req.students?.last_name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.students?.dept_id} • {req.courses?.title}</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                      <button 
                        onClick={() => onStudentDecision(req.stud_id, req.course_id, req.sem_id, 'approve')} 
                        className="flex-1 md:flex-none bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-emerald-50 hover:bg-emerald-600 active:scale-95 transition-all"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => onStudentDecision(req.stud_id, req.course_id, req.sem_id, 'reject')} 
                        className="flex-1 md:flex-none bg-white border border-red-100 text-red-500 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase hover:bg-red-50 transition-all active:scale-95"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {studentRequests.length === 0 && <div className="py-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">No pending enrollments</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentRecordTab({ studentId }: { studentId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentRecord(studentId).then(data => {
      // FIXED: Filter out anything that isn't status 2 (Advisor Approved) immediately
      const finalizedOnly = (data || []).filter((r: any) => r.status === 2);
      setRecords(finalizedOnly);
      setLoading(false);
    });
  }, [studentId]);

  // 1. Group ONLY finalized records by Semester
  const semestersMap = records.reduce((acc: any, curr: any) => {
    const semId = curr.sem_id;
    if (!acc[semId]) acc[semId] = { info: curr.semesters, courses: [] };
    acc[semId].courses.push(curr);
    return acc;
  }, {});

  // 2. Sort chronologically (oldest first) for cumulative logic
  const chronoSems = Object.keys(semestersMap).sort();

  // Cumulative Counters
  let cumulEarnedCredits = 0;
  let cumulCgpaPoints = 0;
  let cumulCgpaCredits = 0;

  if (loading) return <div className="py-20 text-center animate-pulse font-black text-[10px] text-slate-400 uppercase tracking-widest">Synchronizing Records...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-1 pb-20 animate-in fade-in duration-500">
      {chronoSems.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No advisor-approved records found.</p>
        </div>
      ) : (
        chronoSems.map((semId) => {
          const semData = semestersMap[semId];
          
          let semSgpaPoints = 0;
          let semSgpaCredits = 0;
          let semEarnedCredits = 0;
          let semRegisteredCredits = 0;

          semData.courses.forEach((c: any) => {
            const credits = parseFloat(c.courses?.credits || 0);
            const gp = parseFloat(c.grade_points || 0);
            const grade = c.grade;

            if (grade) {
              semRegisteredCredits += credits;

              // SGPA logic: Include E and F
              if (grade !== 'W') {
                semSgpaPoints += (credits * gp);
                semSgpaCredits += credits;

                // CGPA & Earned logic: Exclude E, F, and W
                if (grade !== 'E' && grade !== 'F') {
                  semEarnedCredits += credits;
                  cumulCgpaPoints += (credits * gp);
                  cumulCgpaCredits += credits;
                }
              }
            }
          });

          cumulEarnedCredits += semEarnedCredits;
          const sgpa = semSgpaCredits > 0 ? (semSgpaPoints / semSgpaCredits).toFixed(2) : "0.00";
          const cgpa = cumulCgpaCredits > 0 ? (cumulCgpaPoints / cumulCgpaCredits).toFixed(2) : "0.00";

          return (
            <div key={semId} className="mb-8 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              {/* STATS STRIP */}
              <div className="bg-slate-900 px-6 py-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-[10px] font-black uppercase tracking-widest text-white">
                <span className="text-blue-400">Academic session: {semId}</span>
                <span>SGPA: <span className="text-blue-400">{sgpa}</span></span>
                <span>Credits registered: {semRegisteredCredits}</span>
                <span>Earned Credits: {semEarnedCredits}</span>
                <span>Cumul. Earned Credits: {cumulEarnedCredits}</span>
                <span className="ml-auto">CGPA: <span className="text-emerald-400">{cgpa}</span></span>
              </div>

              {/* COURSE TABLE */}
              <table className="w-full text-left bg-white text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-3 w-16">#</th>
                    <th className="px-6 py-3">Course Code & Title</th>
                    <th className="px-6 py-3 text-center">Type</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {semData.courses.map((c: any, idx: number) => (
                    <tr key={c.course_id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{c.course_id} - {c.courses?.title}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 font-medium">Credit</td>
                      <td className="px-6 py-4 text-center text-slate-500 font-medium uppercase font-black text-[9px]">Enrolled</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-black ${c.grade === 'F' || c.grade === 'E' ? 'text-red-500' : 'text-slate-700'}`}>
                          {c.grade || '--'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}

function StudentEnrollmentTab({ studentId }: { studentId: string }) {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- RE-FETCH LOGIC ---
  const loadData = async () => {
    setLoading(true);
    const [enrolled, available] = await Promise.all([
      getMyEnrolledCourses(studentId), 
      getAvailableOpenCourses(studentId) 
    ]);
    // Ensure we set fresh arrays
    setEnrolledCourses(enrolled || []);
    setAvailableCourses(available || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleEnrollRequest = async (courseId: string, semId: string) => {
    const res = await requestEnrollment(studentId, courseId, semId);
    if (res.success) {
      alert("Request sent!");
      // CRITICAL: Re-run local load to update UI immediately
      await loadData(); 
    } else {
      alert(res.message);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Syncing Academic Load...</div>;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500 pb-20">
      
      {/* LEFT COLUMN: MY COURSES */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">My Academic Load</h3>
          <button onClick={loadData} className="text-[9px] font-black text-blue-600 hover:underline uppercase">Refresh Status ↻</button>
        </div>

        <div className="p-6 space-y-3 flex-1">
          {enrolledCourses.map((c: any) => (
            <div key={`${c.course_id}-${c.sem_id}`} className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase">{c.sem_id}</span>
                  
                  {/* REFINED STATUS BADGES */}
                  {c.status === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-200">
                      Pending Instructor
                    </span>
                  )}
                  {c.status === 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-200">
                      Pending Advisor
                    </span>
                  )}
                  {c.status === 2 && (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Enrolled
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-slate-800 text-sm leading-tight">{c.courses?.title}</h4>
                <div className="text-[10px] font-mono font-bold text-blue-600 mt-1">{c.course_id} • {c.courses?.credits} Credits</div>
              </div>

              {/* Success Icon: Only shown when fully enrolled */}
              {c.status === 2 && (
                <div className="h-8 w-8 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center font-black text-xs border border-emerald-100 shadow-inner">
                  ✓
                </div>
              )}
            </div>
          ))}
          {enrolledCourses.length === 0 && <div className="py-20 text-center text-slate-300 italic font-black text-[10px] uppercase tracking-[0.3em]">No courses joined yet</div>}
        </div>
      </div>

      {/* RIGHT COLUMN: AVAILABLE TO JOIN */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-blue-50/50"><h3 className="font-black text-blue-800 text-sm uppercase tracking-widest">Available to Register</h3></div>
        <div className="p-6 space-y-3 flex-1">
          {availableCourses.length > 0 ? (
            availableCourses.map((c: any) => {
              // Hide if already requested
              if (enrolledCourses.some(e => e.course_id === c.course_id && e.sem_id === c.sem_id)) return null;

              return (
                <div key={`${c.course_id}-${c.sem_id}`} className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-blue-400 transition-all flex justify-between items-center group">
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{c.sem_id}</span>
                    <h4 className="font-bold text-slate-800 text-sm">{c.courses?.title}</h4>
                    <span className="text-[9px] font-bold text-blue-500 font-mono">Faculty: {c.instructors?.first_name} {c.instructors?.last_name}</span>
                  </div>
                  <button onClick={() => handleEnrollRequest(c.course_id, c.sem_id)} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95">Join</button>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">No classes available</div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// STUDENT TAB: FEES & REGISTRATION
// =========================================================
function StudentFeesTab({ studentId, semesters }: { studentId: string, semesters: any[] }) {
  const [formData, setFormData] = useState({
    semester_id: '',
    transaction_no: '',
    amount: '',
    date_of_transaction: ''
  });
  const [myFees, setMyFees] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load fee history for the right-hand panel
  const loadMyFees = async () => {
    const data = await getMyFeeHistory(studentId); // Fetches from actions.ts
    setMyFees(data);
  };

  useEffect(() => { loadMyFees(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Mandatory Validation
    if (!formData.semester_id || !formData.transaction_no || !formData.amount || !formData.date_of_transaction) {
      return alert("All fields are compulsory to enter.");
    }

    // 2. Discard/Replace Logic
    const existingEntry = myFees.find(f => f.semester_id === formData.semester_id);
    if (existingEntry) {
      const confirmReplace = confirm(
        `A record already exists for ${getSemesterDisplayName(existingEntry.semesters || existingEntry)}.\n\n` +
        `Existing TXN: ${existingEntry.transaction_no}\n\n` +
        `Click OK to REPLACE this record, or Cancel to DISCARD your changes.`
      );
      if (!confirmReplace) return;
    }

    setIsSubmitting(true);
    const res = await submitFeesAndRegister({
      ...formData,
      stud_id: studentId,
      amount: parseFloat(formData.amount)
    });

    if (res.success) {
      alert("Submission successful! Your registration is now pending admin approval.");
      setFormData({ semester_id: '', transaction_no: '', amount: '', date_of_transaction: '' });
      loadMyFees();
    } else {
      alert("Error: " + res.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* TWO-COLUMN LAYOUT: Left (Form) | Right (History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: UPLOAD FEES & REGISTER (5 units) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            
            <div className="mb-8">
              <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">New Fee Submission</h3>
              <p className="text-xs text-slate-400 mt-1 font-bold italic">Completing this automatically requests registration.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Target Semester Dropdown */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Academic Semester</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  value={formData.semester_id} 
                  onChange={e => setFormData({...formData, semester_id: e.target.value})}
                >
                  <option value="">Choose Semester...</option>
                  {semesters.map(s => (
                    <option key={s.sem_id} value={s.sem_id}>{getSemesterDisplayName(s)}</option>
                  ))}
                </select>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Transaction Number</label>
                <input 
                  required 
                  placeholder="e.g. TXN987654321" 
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  value={formData.transaction_no} 
                  onChange={e => setFormData({...formData, transaction_no: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount Paid */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Amount Paid / Rupees</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                  />
                </div>
                {/* Transaction Date */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Transaction Date</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    value={formData.date_of_transaction} 
                    onChange={e => setFormData({...formData, date_of_transaction: e.target.value})} 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-[10px] tracking-[0.2em] uppercase hover:bg-blue-600 active:scale-95 transition-all shadow-xl shadow-blue-100 disabled:bg-slate-300"
              >
                {isSubmitting ? 'Processing...' : 'Submit Fees & Register'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIOUS FEE RECORDS (7 units) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Fee History</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Your submitted transaction records</p>
              </div>
              <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-[10px] font-black text-slate-500">
                {myFees.length} ENTRIES
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">Semester Context</th>
                    <th className="px-8 py-5">Transaction ID</th>
                    <th className="px-8 py-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myFees.map((fee) => (
                    <tr key={fee.semester_id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-700">{getSemesterDisplayName(fee.semesters || fee)}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{fee.date_of_transaction}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-mono text-blue-600 font-black text-xs bg-blue-50 px-2 py-1 rounded-lg">
                          {fee.transaction_no}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="font-black text-slate-900 text-base">₹{parseFloat(fee.amount).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                  {myFees.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-slate-400 italic text-xs">
                        No previous payment records found. Submit your first entry on the left.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// =========================================================
// ADMIN TAB: DASHBOARD
// =========================================================s
function AdminDashboardContent({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [activeSems, setActiveSems] = useState<any[]>([]);

  useEffect(() => { 
    getSystemStats().then(setStats);
    getActiveSemesters().then(setActiveSems);
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <UserProfileHeader 
        profile={{ 
          first_name: user.first_name, last_name: user.last_name, admin_id: user.admin_id,
          status: 'Root Admin', departments: { dept_name: 'Administration' }
        }} 
        role="admin" 
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Depts', value: stats?.deptCount, icon: '🏢' },
          { label: 'Courses', value: stats?.courseCount, icon: '📚' },
          { label: 'Students', value: stats?.studentCount, icon: '🎓' },
          { label: 'Faculty', value: stats?.facultyCount, icon: '👨‍🏫' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-2xl font-black text-slate-800">{item.value ?? '...'}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
          </div>
        ))}
      </div>

      {/* READ-ONLY VIEW FOR ADMIN */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
           <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
           Active System Sessions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeSems.map(sem => (
            <div key={sem.sem_id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-700">{sem.sem_no === 1 ? 'First' : sem.sem_no === 2 ? 'Second' : 'Summer'} Sem</h4>
                <p className="text-xs text-slate-400 font-mono">AY {sem.year1}-{sem.year1+1}</p>
              </div>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                Admin Authorized
              </span>
            </div>
          ))}
          {activeSems.length === 0 && <p className="text-slate-400 italic text-sm">No active semesters found.</p>}
        </div>
      </div>
    </div>
  );
}

function ActiveSemestersSection({ userId, role }: { userId: string, role: 'student' | 'instructor' }) {
  const [activeSems, setActiveSems] = useState<any[]>([]);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [sems, regs] = await Promise.all([getActiveSemesters(), getMyRegistrations(userId)]);
    setActiveSems(sems);
    setMyRegs(regs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleRegister = async (semId: string) => {
    if (!confirm("Apply for registration?")) return;
    const res = await registerForSemester(userId, semId, role);
    if (res.success) { alert(res.message); loadData(); }
    else alert("Error: " + res.message);
  };

  if (loading) return <div className="p-8 text-slate-400 text-sm italic">Syncing sessions...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
        <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
        Active Semesters
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeSems.map(sem => {
          const reg = myRegs.find(r => r.semester_id === sem.sem_id);
          return (
            <div key={sem.sem_id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="mb-4">
                <span className="text-[10px] font-bold text-blue-600 uppercase">{sem.sem_id}</span>
                <h4 className="text-lg font-bold text-slate-800">{sem.sem_no === 1 ? 'First' : sem.sem_no === 2 ? 'Second' : 'Summer'} Sem</h4>
                <p className="text-xs text-slate-400 font-mono">AY {sem.year1}-{sem.year1+1}</p>
              </div>
              {!reg ? (
                <button onClick={() => handleRegister(sem.sem_id)} className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-bold">REGISTER</button>
              ) : (
                <div className={`p-2 rounded border text-center font-bold text-[10px] uppercase tracking-widest ${
                  reg.registration_status === 1 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'
                }`}>
                  {reg.registration_status === 1 ? '✓ Enrolled' : '⏳ Pending'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardLayout({ user, role, onLogout, children, tabs }: { user: any, role: string, onLogout: () => void, children: React.ReactNode, tabs: {id: string, label: string}[] }) {
  // Explicitly type as <string> and ensure a string is ALWAYS returned
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem(`aims_${role}_active_tab`);
      // Validate that the saved tab exists in the current tab list
      if (savedTab && tabs.find(t => t.id === savedTab)) {
        return savedTab;
      }
    }
    return tabs[0].id;
  });

  useEffect(() => {
    localStorage.setItem(`aims_${role}_active_tab`, activeTab);
  }, [activeTab, role]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-black tracking-tighter text-slate-900">AIMS <span className="text-blue-600">{role.toUpperCase()}</span></h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Portal Version 1.0</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded">LOGOUT</button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { activeTab });
          }
          return child;
        })}
      </main>
    </div>
  );
}

// Find where StudentPortal is defined (around line 348)
function StudentPortal({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [activeSemesters, setActiveSemesters] = useState<any[]>([]);

  useEffect(() => { 
    getStudentProfile(user.stud_id).then((data) => {
      if (!data) onLogout();
      else setProfile(data);
    }); 
    getSemesters().then(setActiveSemesters);
  }, []);

  if (!profile) return <div className="h-screen flex items-center justify-center text-slate-400">Synchronizing...</div>;

  return (
    <DashboardLayout 
      user={user} role="student" onLogout={onLogout} 
      tabs={[
        {id: 'dashboard', label: 'Dashboard'},
        {id: 'fees', label: 'Fees & Registration'},
        {id: 'enrollment', label: 'Course Enrollment'},
        {id: 'record', label: 'Student Record'} // ADDED TAB
      ]}
    >
      <StudentContent profile={profile} semesters={activeSemesters.filter(s => s.is_active)} />
    </DashboardLayout>
  );
}

function StudentContent({ profile, activeTab, semesters }: any) {
  if (activeTab === 'fees') return <StudentFeesTab studentId={profile.stud_id} semesters={semesters} />;
  if (activeTab === 'enrollment') return <StudentEnrollmentTab studentId={profile.stud_id} />;
  if (activeTab === 'record') return <StudentRecordTab studentId={profile.stud_id} />; // ADDED DISPATCHER

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <UserProfileHeader profile={profile} role="student" />
      <ActiveSemestersSection userId={profile.stud_id} role="student" />
    </div>
  );
}

// =========================================================
// SHARED UI COMPONENTS
// =========================================================
function UserProfileHeader({ profile, role }: { profile: any, role: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
      <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl border border-slate-200">
        {role === 'student' ? '🎓' : role === 'admin' ? '⚙️' : '👨‍🏫'}
      </div>
      <div className="text-center md:text-left">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
          <h1 className="text-2xl font-black text-slate-900">{profile.first_name} {profile.last_name || ''}</h1>
          <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-tighter">{role}</span>
        </div>
        <p className="text-sm font-mono text-slate-500">{profile.stud_id || profile.ins_id || profile.admin_id}</p>
        <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
          <span className="bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold">{profile.departments?.dept_name || 'System Admin'}</span>
          {profile.degrees?.name && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold">{profile.degrees.name}</span>}
          <span className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full text-xs font-bold uppercase">{profile.status || 'Active'}</span>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// NEW TAB: MANAGE COURSES (Updated: Levels 5-9 & Manual Numbers)
// =========================================================
function ManageCoursesContent() {
  // --- NEW UI STATE FOR OFFERING ---
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedCourseForOffering, setSelectedCourseForOffering] = useState<any>(null);
  const [targetSemId, setTargetSemId] = useState('');
  const [semesters, setSemesters] = useState<any[]>([]);

  // Update loadData to include semesters
  const loadData = async () => {
    const [c, d, cat, sems, reqs] = await Promise.all([
      getCourses(),
      getDepartments(),
      getCourseCategories(),
      getSemesters(),
      getTeachingRequests() // Fetch new data
    ]);
    setCourses(c);
    setDepts(d);
    setCategories(cat);
    setSemesters(sems);
    setRequests(reqs);
    if (sems.length > 0) setTargetSemId(sems[0].sem_id);
  };

  const handleOfferSubmit = async () => {
    if (!selectedCourseForOffering || !targetSemId) return;
    
    const res = await openCourseForSemester(selectedCourseForOffering.course_id, targetSemId);
    if (res.success) {
      alert(`Course ${selectedCourseForOffering.course_id} is now open for ${targetSemId}`);
      setIsOfferModalOpen(false);
    } else {
      alert(res.message);
    }
  };

  // --- DATA STATE ---
  const [courses, setCourses] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // --- UI STATE ---
  const [subTab, setSubTab] = useState<'master' | 'categories' | 'pending'>('master');
  const [requests, setRequests] = useState<any[]>([]); // New state for requests
  const [showAddForm, setShowAddForm] = useState(false);

  // --- FILTER STATE ---
  const [filterText, setFilterText] = useState('');
  const [filterPrefix, setFilterPrefix] = useState('');
  const [filterLevel, setFilterLevel] = useState(''); // New Filter

  // --- FORM STATE ---
  const [courseType, setCourseType] = useState<'dept' | 'other'>('dept'); // "Departmental" vs "Other"
  
  // Level Management
  const [levelType, setLevelType] = useState('1'); // 1-4 or 'other'
  const [extendedLevel, setExtendedLevel] = useState('5'); // 5-9 (only if levelType is 'other')
  
  // Available Numbers
  const [availableNos, setAvailableNos] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    deptId: '',      
    catId: '',       
    title: '',
    courseNo: '', // NEW: Selected manually from available list
    l: 3, t: 0, p: 0, s: 0
  });

  // Category Management Form State
  const [newCatId, setNewCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // --- EFFECT: Fetch Available Numbers ---
  // Triggered when Prefix (Dept/Cat) OR Level changes
  useEffect(() => {
    const fetchNumbers = async () => {
      // 1. Determine Prefix
      const prefix = courseType === 'dept' ? formData.deptId : formData.catId;
      
      // 2. Determine Final Level
      const finalLevel = levelType === 'other' ? parseInt(extendedLevel) : parseInt(levelType);

      if (!prefix || isNaN(finalLevel)) {
        setAvailableNos([]);
        return;
      }

      // 3. Fetch from Backend
      const nums = await getAvailableNumbers(prefix, finalLevel);
      setAvailableNos(nums);
      
      // 4. Auto-select first available or reset
      if (nums.length > 0) {
        setFormData(prev => ({ ...prev, courseNo: nums[0].toString() }));
      } else {
        setFormData(prev => ({ ...prev, courseNo: '' }));
      }
    };

    if (showAddForm) {
      fetchNumbers();
    }
  }, [formData.deptId, formData.catId, levelType, extendedLevel, courseType, showAddForm]);

  const calculatedCredits = React.useMemo(() => formData.l + (formData.p / 2), [formData.l, formData.p]);

  // --- ACTIONS ---

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const prefix = courseType === 'dept' ? formData.deptId : formData.catId;
    const linkedDept = courseType === 'dept' ? formData.deptId : null;
    const finalLevel = levelType === 'other' ? extendedLevel : levelType;

    if (!prefix) return alert("Please select a Prefix (Department or Category).");
    if (!formData.courseNo) return alert("Please select a Course Number.");

    const res = await createCourse({
      prefix: prefix,
      dept_id: linkedDept,
      title: formData.title,
      category: finalLevel,
      course_no: formData.courseNo, // Passing manual number
      l: formData.l, t: formData.t, p: formData.p, s: formData.s
    });

    if (res.success) {
      alert(res.message);
      setShowAddForm(false);
      // Reset Form
      setFormData({ deptId: '', catId: '', title: '', courseNo: '', l: 3, t: 0, p: 0, s: 0 });
      setLevelType('1');
      setExtendedLevel('5');
      loadData();
    } else {
      alert("Error: " + res.message);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatId || !newCatName) return alert("Fill all fields");
    const res = await createCourseCategory(newCatId, newCatName);
    if (res.success) {
      setNewCatId(''); setNewCatName(''); loadData();
    } else {
      alert(res.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(`Delete category '${id}'?`)) return;
    const res = await deleteCourseCategory(id);
    if (res.success) loadData();
    else alert(res.message);
  };

  // --- FILTERING ---
  const displayedCourses = courses.filter(c => {
    const matchText = filterText ? (c.course_id + c.title).toLowerCase().includes(filterText.toLowerCase()) : true;
    const matchPrefix = filterPrefix ? c.prefix === filterPrefix : true;
    const matchLevel = filterLevel ? c.category.toString() === filterLevel : true;
    return matchText && matchPrefix && matchLevel;
  });

  const onDecision = async (insId: string, courseId: string, semId: string, action: 'approve' | 'reject') => {
    const res = await handleTeachingRequest(insId, courseId, semId, action);
    if (res.success) loadData();
    else alert(res.message);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* HEADER & TABS (Updated with 3rd Tab) */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Courses Master</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Academic catalog and faculty assignments</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
          {['master', 'categories', 'pending'].map((t) => (
            <button 
              key={t}
              onClick={() => setSubTab(t as any)} 
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                subTab === t ? 'bg-white shadow-lg text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'master' ? 'Catalog' : t === 'categories' ? 'ID Categories' : 'Pending Requests'}
            </button>
          ))}
        </div>
      </div>

      {/* ================= VIEW 1: MANAGE CATEGORIES ================= */}
      {subTab === 'categories' && (
        <div className="space-y-8">
          
          {/* SECTION A: DEPARTMENTAL (Read Only) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-700">Departmental Prefixes</h3>
                <p className="text-xs text-slate-400">These are automatically synced with your Active Departments.</p>
              </div>
              <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">Read Only</span>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {depts.map(d => (
                <div key={d.dept_id} className="border border-slate-100 p-3 rounded bg-slate-50/50 flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-700">{d.dept_id}</span>
                  <span className="text-xs text-slate-500 truncate ml-2">{d.dept_name}</span>
                </div>
              ))}
              {depts.length === 0 && <div className="text-slate-400 text-sm italic col-span-4">No departments found.</div>}
            </div>
          </div>

          {/* SECTION B: OTHER (Editable) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* List */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50">
                <h3 className="font-bold text-slate-700">Other Categories</h3>
                <p className="text-xs text-slate-400">Custom prefixes for general or interdisciplinary courses (e.g., GE, HS).</p>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="p-4">Prefix</th><th className="p-4">Name</th><th className="p-4 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map(c => (
                    <tr key={c.cat_id}>
                      <td className="p-4 font-mono font-bold text-purple-700">{c.cat_id}</td>
                      <td className="p-4">{c.name}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteCategory(c.cat_id)} className="text-red-400 font-bold text-xs hover:text-red-600 hover:underline">DELETE</button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No custom categories created yet.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Create Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit sticky top-6">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">NEW</span> 
                Create Category
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Prefix ID (Unique)</label>
                  <input placeholder="e.g. GE" maxLength={3} className="w-full border p-2 rounded uppercase font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={newCatId} onChange={e=>setNewCatId(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category Name</label>
                  <input placeholder="e.g. General Engineering" className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={newCatName} onChange={e=>setNewCatName(e.target.value)} />
                </div>
                <button onClick={handleCreateCategory} className="w-full bg-slate-900 text-white font-bold py-2 rounded text-sm hover:bg-slate-800 transition-colors">
                  Create Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: COURSE CATALOG ================= */}
      {subTab === 'master' && (
        <>
          {/* Action Bar & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
             {/* Filter 1: Search */}
             <div className="md:col-span-4">
               <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search</label>
               <input placeholder="Search ID or Title..." className="border rounded px-3 py-2 text-sm w-full outline-none focus:border-blue-500" value={filterText} onChange={e=>setFilterText(e.target.value)} />
             </div>
             
             {/* Filter 2: Prefix */}
             <div className="md:col-span-3">
               <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Prefix</label>
               <select className="border rounded px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 w-full" value={filterPrefix} onChange={e=>setFilterPrefix(e.target.value)}>
                 <option value="">All Prefixes</option>
                 <optgroup label="Departments">
                   {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_id}</option>)}
                 </optgroup>
                 <optgroup label="Other Categories">
                   {categories.map(c=><option key={c.cat_id} value={c.cat_id}>{c.cat_id}</option>)}
                 </optgroup>
               </select>
             </div>

             {/* Filter 3: Level */}
             <div className="md:col-span-3">
               <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Course Level</label>
               <select className="border rounded px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 w-full" value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
                 <option value="">All Levels</option>
                 <option value="1">1st Year (1xx)</option>
                 <option value="2">2nd Year (2xx)</option>
                 <option value="3">3rd Year (3xx)</option>
                 <option value="4">4th Year (4xx)</option>
                 <option value="5">Level 5 (5xx)</option>
                 <option value="6">Level 6 (6xx)</option>
                 <option value="7">Level 7 (7xx)</option>
                 <option value="8">Level 8 (8xx)</option>
                 <option value="9">Level 9 (9xx)</option>
               </select>
             </div>

             {/* Add Button */}
             <div className="md:col-span-2 flex justify-end">
                <button onClick={() => setShowAddForm(!showAddForm)} className={`w-full px-4 py-2 rounded-lg font-bold text-sm transition-colors ${showAddForm ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {showAddForm ? 'Cancel' : '+ Add Course'}
                </button>
             </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-in slide-in-from-top-4 relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 rounded-l-xl"></div>
              <h3 className="font-bold text-lg text-slate-800 mb-6">Add New Course to Catalog</h3>
              
              <form onSubmit={handleCreateCourse} className="space-y-6">
                
                {/* 1. Course Classification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Type Toggle & Prefix */}
                  <div className="space-y-4">
                     {/* Toggle */}
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prefix Source</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button type="button" onClick={()=>{setCourseType('dept'); setFormData({...formData, catId: ''})}} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${courseType==='dept'?'bg-white shadow text-blue-700':'text-slate-500 hover:text-slate-700'}`}>Departmental</button>
                          <button type="button" onClick={()=>{setCourseType('other'); setFormData({...formData, deptId: ''})}} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${courseType==='other'?'bg-white shadow text-purple-700':'text-slate-500 hover:text-slate-700'}`}>Other</button>
                        </div>
                     </div>

                     {/* Dropdown */}
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {courseType === 'dept' ? 'Select Department' : 'Select Category'}
                        </label>
                        {courseType === 'dept' ? (
                           <select required className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.deptId} onChange={e=>setFormData({...formData, deptId: e.target.value})}>
                             <option value="">Select Department...</option>
                             {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name} ({d.dept_id})</option>)}
                           </select>
                        ) : (
                           <select required className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none" value={formData.catId} onChange={e=>setFormData({...formData, catId: e.target.value})}>
                             <option value="">Select Category...</option>
                             {categories.map(c=><option key={c.cat_id} value={c.cat_id}>{c.name} ({c.cat_id})</option>)}
                           </select>
                        )}
                     </div>
                  </div>

                  {/* Level & Number */}
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-2">
                       {/* Level Type */}
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Level</label>
                          <select className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white" value={levelType} onChange={e=>setLevelType(e.target.value)}>
                            <option value="1">1st Year (1xx)</option>
                            <option value="2">2nd Year (2xx)</option>
                            <option value="3">3rd Year (3xx)</option>
                            <option value="4">4th Year (4xx)</option>
                            <option value="other">Other (5-9)</option>
                          </select>
                       </div>

                       {/* Extended Level (Conditional) */}
                       {levelType === 'other' ? (
                         <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specific</label>
                            <select className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white" value={extendedLevel} onChange={e=>setExtendedLevel(e.target.value)}>
                              <option value="5">Level 5 (5xx)</option>
                              <option value="6">Level 6 (6xx)</option>
                              <option value="7">Level 7 (7xx)</option>
                              <option value="8">Level 8 (8xx)</option>
                              <option value="9">Level 9 (9xx)</option>
                            </select>
                         </div>
                       ) : <div className="hidden"></div>}
                     </div>
                     
                     {/* Available Numbers Dropdown */}
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Last 2 Digits <span className="text-slate-300 font-normal">(Available)</span>
                        </label>
                        <div className="relative">
                          <select 
                             required 
                             className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white font-mono disabled:bg-slate-50 disabled:text-slate-400" 
                             value={formData.courseNo} 
                             onChange={e=>setFormData({...formData, courseNo: e.target.value})}
                             disabled={availableNos.length === 0}
                          >
                            {availableNos.length === 0 ? (
                               <option value="">Select Prefix/Level first...</option>
                            ) : (
                               availableNos.map(n => {
                                 const padded = n.toString().padStart(2, '0');
                                 return <option key={n} value={n}>{padded}</option>
                               })
                            )}
                          </select>
                          
                          {/* Live ID Preview */}
                          {formData.courseNo && (courseType === 'dept' ? formData.deptId : formData.catId) && (
                            <div className="absolute right-8 top-3 text-xs font-bold text-blue-600 pointer-events-none bg-white pl-2">
                               ID: {(courseType === 'dept' ? formData.deptId : formData.catId)}
                                   {(levelType === 'other' ? extendedLevel : levelType)}
                                   {parseInt(formData.courseNo).toString().padStart(2, '0')}
                            </div>
                          )}
                        </div>
                     </div>
                  </div>
                </div>

                {/* 2. Details */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Title</label>
                  <input required className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Advanced Thermodynamics" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
                </div>

                {/* 3. Credits */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 flex flex-wrap gap-6 items-center">
                   <div className="w-20"><span className="text-xs font-bold text-slate-400 block mb-1">Lecture</span><input type="number" min="0" step="0.5" className="w-full border p-2 rounded text-center font-mono text-sm" value={formData.l} onChange={e=>setFormData({...formData, l: parseFloat(e.target.value)||0})} /></div>
                   <div className="w-20"><span className="text-xs font-bold text-slate-400 block mb-1">Tutorial</span><input type="number" min="0" step="0.5" className="w-full border p-2 rounded text-center font-mono text-sm" value={formData.t} onChange={e=>setFormData({...formData, t: parseFloat(e.target.value)||0})} /></div>
                   <div className="w-20"><span className="text-xs font-bold text-slate-400 block mb-1">Practical</span><input type="number" min="0" step="0.5" className="w-full border p-2 rounded text-center font-mono text-sm" value={formData.p} onChange={e=>setFormData({...formData, p: parseFloat(e.target.value)||0})} /></div>
                   <div className="w-20"><span className="text-xs font-bold text-slate-400 block mb-1">Self Study</span><input type="number" min="0" step="0.5" className="w-full border p-2 rounded text-center font-mono text-sm" value={formData.s} onChange={e=>setFormData({...formData, s: parseFloat(e.target.value)||0})} /></div>
                   <div className="ml-auto text-right pl-6 border-l border-slate-200">
                     <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Credits</span>
                     <span className="text-2xl font-mono font-black text-slate-800">{calculatedCredits}</span>
                   </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 mt-4">
                  <button className="bg-slate-900 text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-transform active:scale-95 shadow-sm">
                    Confirm & Save Course
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Prefix Type</th>
                  <th className="px-6 py-4 text-center">Structure</th>
                  <th className="px-6 py-4 text-right">Credits</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCourses.map(c => (
                  <tr key={c.course_id} className="hover:bg-slate-50 group transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-700 group-hover:text-blue-800">{c.course_id}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{c.title}</td>
                    <td className="px-6 py-4 text-xs">
                      {c.dept_id ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded font-bold">Dept: {c.dept_id}</span>
                      ) : (
                        <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded font-bold">Other: {c.prefix}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-mono text-slate-500 bg-slate-50/50 rounded-lg mx-2">{c.l}-{c.t}-{c.p}-{c.s}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">{c.credits}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedCourseForOffering(c);
                          setIsOfferModalOpen(true);
                        }}
                        className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest shadow-sm border border-emerald-100"
                      >
                        Offer
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedCourses.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">No courses found matching your filters.</td></tr>
                )}
              </tbody>
            </table>

            {/* ================= MODAL: OFFER COURSE ================= */}
            {isOfferModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95">
                  
                  {/* Modal Header */}
                  <div className="bg-slate-50 p-6 border-b border-slate-100">
                    <h3 className="text-xl font-black text-slate-800">Open Course Offering</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-1">
                      Catalog ID: <span className="text-blue-600 font-mono">{selectedCourseForOffering?.course_id}</span>
                    </p>
                  </div>

                  {/* Modal Body */}
                  <div className="p-8 space-y-6">
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm mb-1">{selectedCourseForOffering?.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed italic">
                        Select the semester in which this course will be available for registration.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Target Semester</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        value={targetSemId}
                        onChange={(e) => setTargetSemId(e.target.value)}
                      >
                        {semesters.map(s => (
                          <option key={s.sem_id} value={s.sem_id}>
                            {s.sem_id} {s.is_active ? '🟢 (Current)' : '⚪ (Archived)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button 
                      onClick={() => setIsOfferModalOpen(false)}
                      className="flex-1 px-6 py-3 rounded-xl font-black text-[10px] text-slate-400 uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleOfferSubmit}
                      className="flex-1 bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                    >
                      Confirm Offering
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= VIEW 3: PENDING REQUESTS ================= */}
      {subTab === 'pending' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Faculty Teaching Requests</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Approve claims for course sections</p>
            </div>
            <span className="bg-white px-4 py-1.5 rounded-full border border-slate-200 text-[10px] font-black text-slate-500">
              {requests.length} PENDING
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Instructor</th>
                  <th className="px-8 py-5">Course Details</th>
                  <th className="px-8 py-5">Semester</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map((r) => (
                  <tr key={`${r.ins_id}-${r.course_id}-${r.sem_id}`} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-5">
                      <div className="font-black text-slate-800">{r.instructors?.first_name} {r.instructors?.last_name}</div>
                      <div className="text-[10px] font-mono font-bold text-slate-400">{r.ins_id}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-blue-600 font-mono text-xs mb-1">{r.course_id}</div>
                      <div className="font-bold text-slate-700 leading-tight">{r.courses?.title}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                        {getSemesterDisplayName(r.semesters)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => onDecision(r.ins_id, r.course_id, r.sem_id, 'approve')}
                          className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => onDecision(r.ins_id, r.course_id, r.sem_id, 'reject')}
                          className="bg-white border border-red-100 text-red-500 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-black text-[10px] uppercase tracking-[0.3em]">
                      No pending teaching requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// NEW TAB: MANAGE PEOPLE (Full: CSV + Consistency + Filters)
// =========================================================
function ManagePeopleContent() {
  // --- Data State ---
  const [students, setStudents] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [degrees, setDegrees] = useState<any[]>([]);
  const [deptMatrix, setDeptMatrix] = useState<any[]>([]); 
  
  // --- UI State ---
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'faculty'>('students');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Filter State ---
  const [filterName, setFilterName] = useState('');
  const [filterID, setFilterID] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDeg, setFilterDeg] = useState('');

  // --- Manual Form State ---
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '', 
    deptId: '', 
    degId: '', 
    advisorId: '', // NEW: Advisor assignment
    year: new Date().getFullYear(),
    isActive: true 
  });

  // --- Import State ---
  const [importMode, setImportMode] = useState<'manual' | 'csv'>('manual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [importDept, setImportDept] = useState('');
  const [importDeg, setImportDeg] = useState('');
  const [importAdvisor, setImportAdvisor] = useState(''); // NEW: Advisor for batch

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getPeople();
    setStudents(p.students);
    setInstructors(p.instructors);
    
    const d = await getDepartments();
    setDepts(d);
    
    const deg = await getDegrees();
    setDegrees(deg);

    const matrix = await getDeptDegreeMatrix();
    setDeptMatrix(matrix);
  };

  // --- HELPER: Get Degrees available for a specific Dept ---
  const getDegreesForDept = (deptId: string) => {
    if (!deptId) return [];
    const deptEntry = deptMatrix.find((d: any) => d.dept_id === deptId);
    if (!deptEntry || !deptEntry.dept_degrees) return [];
    const offeredIds = deptEntry.dept_degrees.map((dd: any) => dd.deg_id);
    return degrees.filter(d => offeredIds.includes(d.deg_id));
  };

  const manualAvailableDegrees = React.useMemo(() => getDegreesForDept(formData.deptId), [formData.deptId, deptMatrix, degrees]);
  const csvAvailableDegrees = React.useMemo(() => getDegreesForDept(importDept), [importDept, deptMatrix, degrees]);


  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let res;
    
    if (activeSubTab === 'students') {
      res = await addStudent({
        first_name: formData.firstName,
        last_name: formData.lastName,
        dept_id: formData.deptId,
        deg_id: formData.degId,
        advisor_id: formData.advisorId, // INJECTED ADVISOR
        year: formData.year
      });
    } else {
      res = await addInstructor({
        first_name: formData.firstName,
        last_name: formData.lastName,
        dept_id: formData.deptId,
        year: formData.year,
        status: formData.isActive ? 'active' : 'inactive'
      });
    }

    if (res.success) {
      alert(res.message);
      setShowAddForm(false);
      setFormData({ 
        firstName: '', lastName: '', deptId: '', degId: '', advisorId: '',
        year: new Date().getFullYear(), isActive: true 
      });
      loadData();
    } else {
      alert("Error: " + res.message);
    }
  };

  // --- CSV HANDLERS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => setCsvPreview(results.data)
    });
  };

  const handleCsvSubmit = async () => {
    if (!importDept || !importDeg || !importAdvisor) return alert("Select Dept, Degree, and Advisor for this batch."); //
    if (csvPreview.length === 0) return alert("CSV is empty.");

    const payload = csvPreview.map((row: any) => ({
      first_name: row.first_name || row.FirstName,
      last_name: row.last_name || row.LastName,
      dept_id: importDept,
      deg_id: importDeg,
      advisor_id: importAdvisor, // NEW: Batch assignment
      year: importYear
    })).filter(s => s.first_name);

    if (payload.length === 0) return alert("CSV needs 'first_name' column.");
    if (!confirm(`Importing ${payload.length} students. IDs will be auto-assigned.`)) return;

    const res = await batchImportStudents(payload);
    
    if (res.success) {
      alert(res.message);
      setShowAddForm(false);
      setCsvFile(null); setCsvPreview([]); setImportAdvisor('');
      loadData();
    } else {
      alert("Error: " + res.message);
    }
  };

  // --- FILTER LOGIC ---
  const getFilteredList = () => {
    let list = activeSubTab === 'students' ? students : instructors;
    if (filterName) list = list.filter(i => `${i.first_name} ${i.last_name}`.toLowerCase().includes(filterName.toLowerCase()));
    if (filterID) list = list.filter(i => (i.stud_id || i.ins_id).toLowerCase().includes(filterID.toLowerCase()));
    if (filterYear) list = list.filter(i => (i.stud_id || i.ins_id).startsWith(filterYear));
    if (filterDept) list = list.filter(i => i.dept_id === filterDept);
    if (activeSubTab === 'students' && filterDeg) list = list.filter(i => i.deg_id === filterDeg);
    return list;
  };
  const displayedList = getFilteredList();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(displayedList.map(i => i.stud_id || i.ins_id)));
    else setSelectedIds(new Set());
  };
  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };
  const handleBatchAction = async () => {
    const role = activeSubTab === 'students' ? 'student' : 'instructor';
    const status = activeSubTab === 'students' ? 'graduated' : 'inactive';
    if (!confirm(`Update ${selectedIds.size} users?`)) return;
    const res = await batchUpdateUserStatus(Array.from(selectedIds), role, status);
    if(res.success) { alert(res.message); setSelectedIds(new Set()); loadData(); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">People Directory</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Manage system-wide access status.</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95">
          {showAddForm ? 'Close Window' : `+ Add ${activeSubTab === 'students' ? 'Student' : 'Faculty'}`}
        </button>
      </div>

      {/* ADD FORM */}
      {showAddForm && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 animate-in slide-in-from-top-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-2 h-full bg-slate-900"></div>
           <div className="flex justify-between mb-8 border-b border-slate-100 pb-4">
             <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">New {activeSubTab === 'students' ? 'Student Profile' : 'Faculty Profile'}</h3>
             {activeSubTab === 'students' && (
               <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setImportMode('manual')} className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importMode==='manual'?'bg-white shadow text-slate-900':'text-slate-400'}`}>Manual</button>
                 <button onClick={() => setImportMode('csv')} className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importMode==='csv'?'bg-white shadow text-slate-900':'text-slate-400'}`}>CSV Batch</button>
               </div>
             )}
           </div>
           
           {importMode === 'manual' ? (
             <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">First Name <span className="text-red-500">*</span></label><input required className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Last Name</label><input className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Join Year <span className="text-red-500">*</span></label><input type="number" required className="w-full border-slate-200 border p-3 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.year} onChange={e=>setFormData({...formData, year: parseInt(e.target.value)})} /></div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Department <span className="text-red-500">*</span></label>
                  <select required className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.deptId} onChange={e=>{setFormData({...formData, deptId: e.target.value, degId: ''})}}>
                    <option value="">Choose Dept...</option>
                    {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                  </select>
                </div>

                {activeSubTab === 'students' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Degree <span className="text-red-500">*</span></label>
                      <select required className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold bg-white disabled:bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.degId} onChange={e=>setFormData({...formData, degId: e.target.value})} disabled={!formData.deptId}>
                        <option value="">{!formData.deptId ? 'Select Dept First' : 'Select Degree...'}</option>
                        {manualAvailableDegrees.map(d => <option key={d.deg_id} value={d.deg_id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Faculty Advisor <span className="text-red-500">*</span></label>
                      <select required className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.advisorId} onChange={e => setFormData({...formData, advisorId: e.target.value})}>
                        <option value="">Choose Advisor...</option>
                        {instructors.map(ins => (
                          <option key={ins.ins_id} value={ins.ins_id}>{ins.first_name} {ins.last_name} ({ins.dept_id})</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {activeSubTab === 'faculty' && (
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-600 cursor-pointer tracking-widest"><input type="checkbox" checked={formData.isActive} onChange={e=>setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded-lg border-slate-200 text-blue-600" /> Active Enrollment</label>
                  </div>
                )}

                <div className="md:col-span-3 flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                  <button type="button" onClick={()=>setShowAddForm(false)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors">Cancel</button>
                  <button type="submit" className="bg-slate-900 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all">Save Profile</button>
                </div>
             </form>
           ) : (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Joining Year</label>
                  <input type="number" className="w-full border-slate-200 border p-3 rounded-xl text-sm font-mono font-bold" value={importYear} onChange={(e) => setImportYear(parseInt(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Department</label>
                  <select className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold bg-white" value={importDept} onChange={e => {setImportDept(e.target.value); setImportDeg('');}}>
                    <option value="">Select Dept...</option>
                    {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Degree</label>
                  <select className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold bg-white disabled:bg-slate-100" value={importDeg} onChange={e => setImportDeg(e.target.value)} disabled={!importDept}>
                    <option value="">{!importDept ? 'Select Dept First' : 'Select Degree...'}</option>
                    {csvAvailableDegrees.map(deg => <option key={deg.deg_id} value={deg.deg_id}>{deg.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Batch Advisor</label>
                  <select className="w-full border-slate-200 border p-3 rounded-xl text-sm font-bold bg-white" value={importAdvisor} onChange={e => setImportAdvisor(e.target.value)}>
                    <option value="">Assign Advisor...</option>
                    {instructors.map(ins => (
                      <option key={ins.ins_id} value={ins.ins_id}>{ins.first_name} {ins.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!csvFile ? (
                <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-16 text-center hover:bg-slate-50 transition-all group">
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                  <label htmlFor="csv-upload" className="cursor-pointer block">
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📂</div>
                    <span className="font-black text-slate-800 uppercase text-xs tracking-widest group-hover:text-blue-600 transition-colors">Drop CSV or Click to Upload</span>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Columns needed: <code>first_name</code>, <code>last_name</code></p>
                  </label>
                </div>
              ) : (
                <div className="animate-in fade-in">
                  <div className="flex justify-between items-end mb-4 px-2">
                     <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Parsing {csvPreview.length} Records</h4>
                     <button onClick={() => { setCsvFile(null); setCsvPreview([]); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Remove File</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl shadow-inner">
                    <table className="w-full text-left bg-white text-xs">
                      <thead className="bg-slate-900 text-[9px] text-white font-black uppercase tracking-widest sticky top-0">
                        <tr><th className="p-4">First Name</th><th className="p-4">Last Name</th><th className="p-4 text-slate-400">ID Simulation</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {csvPreview.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50"><td className="p-4 font-bold">{row.first_name || row.FirstName}</td><td className="p-4 font-bold">{row.last_name || row.LastName}</td><td className="p-4 font-mono text-xs text-blue-500">{importYear}{importDept}{importDeg}####</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={handleCsvSubmit} className="bg-slate-900 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all">Execute Import</button>
                  </div>
                </div>
              )}
            </div>
           )}
        </div>
      )}

      {/* FILTERS & LIST */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex bg-slate-200/50 p-1 rounded-2xl shadow-inner">
              <button onClick={() => { setActiveSubTab('students'); setSelectedIds(new Set()); }} className={`px-8 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSubTab === 'students' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Students</button>
              <button onClick={() => { setActiveSubTab('faculty'); setSelectedIds(new Set()); }} className={`px-8 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSubTab === 'faculty' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Faculty</button>
            </div>
            {(filterName || filterID || filterYear || filterDept || filterDeg) && (
              <button onClick={() => { setFilterName(''); setFilterID(''); setFilterYear(''); setFilterDept(''); setFilterDeg(''); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline active:scale-95 transition-all">Clear Filters ✕</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Search Name</label>
              <input className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={filterName} onChange={e => setFilterName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">ID / Entry No</label>
              <input className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={filterID} onChange={e => setFilterID(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Year</label>
              <input type="number" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={filterYear} onChange={e => setFilterYear(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Dept</label>
              <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All</option>
                {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_id}</option>)}
              </select>
            </div>
            {activeSubTab === 'students' ? (
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Degree</label>
                <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={filterDeg} onChange={e => setFilterDeg(e.target.value)}>
                  <option value="">All</option>
                  {degrees.map(d => <option key={d.deg_id} value={d.deg_id}>{d.deg_id}</option>)}
                </select>
              </div>
            ) : <div className="hidden md:block"></div>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5 w-10"><input type="checkbox" onChange={handleSelectAll} checked={displayedList.length > 0 && displayedList.every(i => selectedIds.has(i.stud_id || i.ins_id))} className="w-5 h-5 rounded-lg border-slate-200 text-blue-600" /></th>
                <th className="px-8 py-5">System ID</th>
                <th className="px-8 py-5">Full Name</th>
                <th className="px-8 py-5">Affiliation</th>
                <th className="px-8 py-5 text-right">Access Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedList.map((item) => {
                const id = item.stud_id || item.ins_id;
                const fullName = `${item.first_name} ${item.last_name || ''}`;
                return (
                  <tr key={id} className={`hover:bg-slate-50 transition-all group ${selectedIds.has(id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-8 py-5"><input type="checkbox" checked={selectedIds.has(id)} onChange={() => handleSelectRow(id)} className="w-5 h-5 rounded-lg border-slate-200 text-blue-600" /></td>
                    <td className="px-8 py-5 font-mono font-bold text-slate-800">{id}</td>
                    <td className="px-8 py-5 font-black text-slate-700">{fullName}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-[10px] text-slate-500 uppercase tracking-tighter">{item.departments?.dept_name || item.dept_id}</span>
                        {item.deg_id && <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit mt-1 font-black text-slate-400 uppercase">{item.degrees?.name || item.deg_id}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right"><span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{item.status}</span></td>
                  </tr>
                );
              })}
              {displayedList.length === 0 && (
                <tr><td colSpan={5} className="p-20 text-center text-slate-300 italic font-black text-[10px] uppercase tracking-[0.4em]">Directory is empty</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* FLOATING ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-10 z-50 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Selection</span>
            <span className="font-black text-sm"><span className="text-blue-400 mr-2">{selectedIds.size}</span> Profiles</span>
          </div>
          <div className="h-10 w-px bg-slate-800"></div>
          <button onClick={handleBatchAction} className="text-[10px] font-black tracking-[0.2em] text-red-400 hover:text-red-300 uppercase transition-colors">
            {activeSubTab === 'students' ? 'Archive/Graduate' : 'Deactivate Access'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="h-10 w-10 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 hover:text-white transition-all hover:bg-slate-700">&times;</button>
        </div>
      )}

    </div>
  );
}

// =========================================================
// NEW TAB: MANAGE DEGREES
// =========================================================
function ManageDegreesContent() {
  // Data State
  const [degrees, setDegrees] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any[]>([]); // Depts + their offerings

  // Form State
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const d = await getDegrees();
    const m = await getDeptDegreeMatrix();
    setDegrees(d);
    setMatrix(m);
  };

  // --- ACTIONS ---

  const handleCreate = async () => {
    if (!newId || !newName) return alert("Please fill ID and Name");
    const res = await createDegree(newId, newName);
    if (res.success) {
      setNewId('');
      setNewName('');
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handleDissolve = async (degId: string) => {
    if (!confirm(`Permanently dissolve the degree '${degId}'?`)) return;
    const res = await dissolveDegree(degId);
    if (res.success) loadData();
    else alert(res.message);
  };

  const handleToggleOffer = async (deptId: string, degId: string, isCurrentlyOffered: boolean) => {
    if (isCurrentlyOffered) {
      // Try to REMOVE
      const res = await removeDegreeFromDept(deptId, degId);
      if (res.success) loadData();
      else alert(res.message); // Will show error if students exist
    } else {
      // Try to ADD
      const res = await addDegreeToDept(deptId, degId);
      if (res.success) loadData();
      else alert(res.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800">Degree Management</h2>
        <p className="text-slate-500">Configure degree types and link them to departments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COL: MASTER DEGREE LIST (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Create Form */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Create New Degree</h3>
            <div className="space-y-3">
              <input 
                className="w-full border border-slate-300 p-2 rounded text-sm uppercase font-mono"
                placeholder="ID (e.g. B, M)"
                maxLength={2}
                value={newId}
                onChange={(e) => setNewId(e.target.value.toUpperCase())}
              />
              <input 
                className="w-full border border-slate-300 p-2 rounded text-sm"
                placeholder="Name (e.g. Bachelor of Technology)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button 
                onClick={handleCreate}
                className="w-full bg-slate-900 text-white font-bold py-2 rounded text-sm hover:bg-slate-800"
              >
                ADD DEGREE
              </button>
            </div>
          </div>

          {/* List of Degrees */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-bold text-slate-700 text-sm">Available Degrees</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {degrees.map((deg) => (
                <div key={deg.deg_id} className="p-4 flex justify-between items-center group hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-800 block">{deg.deg_id}</span>
                    <span className="text-xs text-slate-500">{deg.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDissolve(deg.deg_id)}
                    className="text-slate-300 hover:text-red-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    DISSOLVE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COL: DEPARTMENT OFFERINGS MATRIX (8 columns) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700">Department Offerings</h3>
              <p className="text-xs text-slate-400 mt-1">Check a box to offer a degree in a department. Uncheck to remove.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {matrix.map((dept) => {
                // Determine which degrees this dept currently offers
                const offeredIds = dept.dept_degrees.map((dd: any) => dd.deg_id);

                return (
                  <div key={dept.dept_id} className="p-6">
                    <div className="flex items-baseline gap-3 mb-4">
                      <h4 className="font-bold text-slate-800 text-lg">{dept.dept_name}</h4>
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{dept.dept_id}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {degrees.map((deg) => {
                        const isOffered = offeredIds.includes(deg.deg_id);
                        return (
                          <label 
                            key={deg.deg_id} 
                            className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${
                              isOffered 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              checked={isOffered}
                              onChange={() => handleToggleOffer(dept.dept_id, deg.deg_id, isOffered)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                              <div className={`font-bold text-sm ${isOffered ? 'text-blue-800' : 'text-slate-600'}`}>
                                {deg.deg_id}
                              </div>
                              <div className="text-[10px] text-slate-400 leading-tight">
                                {deg.name}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {matrix.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic">
                  No departments found. Go to 'Manage Departments' to create one.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// =========================================================
// NEW COMPONENT: MANAGE DEPARTMENTS TAB
// =========================================================
function ManageDepartmentsContent() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDepts();
  }, []);

  const loadDepts = async () => {
    const data = await getDepartments();
    setDepartments(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createDepartment(newId.toUpperCase(), newName); // Force Uppercase ID
    if (res.success) {
      alert(res.message);
      setNewId('');
      setNewName('');
      loadDepts();
    } else {
      alert("Error: " + res.message);
    }
    setLoading(false);
  };

  const handleDelete = async (deptId: string) => {
    if (!confirm(`Are you sure you want to DISSOLVE the ${deptId} department?`)) return;
    
    const res = await deleteDepartment(deptId);
    if (res.success) {
      alert("Department Dissolved");
      loadDepts();
    } else {
      alert("Failed: " + res.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800">Departments</h2>
        <p className="text-slate-500">Manage academic departments and faculties.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT: LIST OF DEPARTMENTS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700">Active Departments</h3>
          </div>
          <div className="p-0">
            {departments.length === 0 && <div className="p-4 text-center text-slate-400">No departments found.</div>}
            
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d.dept_id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{d.dept_id}</td>
                    <td className="px-4 py-3 text-slate-600">{d.dept_name}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleDelete(d.dept_id)}
                        className="text-red-400 hover:text-red-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        DISSOLVE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: CREATE FORM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-800 mb-4">Establish New Department</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">DEPT ID (Unique)</label>
              <input 
                type="text" 
                required
                maxLength={5}
                placeholder="e.g. CS"
                className="w-full border border-slate-300 rounded p-2 font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">DEPT NAME (Unique)</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Computer Science"
                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-2 rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Department'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

// =========================================================
// 1. THE CONTENT FOR "MANAGE SEMESTERS" TAB
// =========================================================
function ManageSemestersContent({ user }: { user: any }) {
  // --- VIEW STATE ---
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedSem, setSelectedSem] = useState<any>(null);
  const [offeredCourses, setOfferedCourses] = useState<any[]>([]);

  const openSemesterDetails = async (sem: any) => {
    setSelectedSem(sem);
    setView('detail');
    
    // Fetch the courses associated with this semester ID
    const courses = await getSemesterCourses(sem.sem_id);
    setOfferedCourses(courses);
  };

  // --- DATA STATE ---
  const [semesters, setSemesters] = useState<any[]>([]);
  
  // Creation States
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [semType, setSemType] = useState<number>(1); // 1=Sem1, 2=Sem2, 3=Summer, 0=Custom
  const [customName, setCustomName] = useState('');

  // Registration Console States
  const [showStudents, setShowStudents] = useState(true);
  const [showInstructors, setShowInstructors] = useState(true);
  const [pendingData, setPendingData] = useState<{ 
    students: any[], 
    instructors: any[] 
  }>({ 
    students: [], 
    instructors: [] 
  });
  const [activeSemId, setActiveSemId] = useState<string>('ALL'); 

  const loadDashboardData = async () => {
    // 1. Fetch data from your action
    const pending = await getPendingRegistrations(); 
    
    // 2. Ensure pending isn't null before setting state
    if (pending) {
      setPendingData({
        students: pending.students || [],
        instructors: pending.instructors || []
      });
    }
    
    const sems = await getSemesters();
    setSemesters(sems);
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeSemId]); // Re-runs when you switch from "All" to a specific Semester

  // Add this to your useEffect to reload pending requests when the ID changes
  useEffect(() => {
    loadDashboardData();
  }, [activeSemId]);

  // --- HELPER: VALIDATE CREATION DATE ---
  const isCreationInvalid = () => {
    const now = new Date();
    
    // Logic: Month is 0-indexed (Nov=10, May=4, July=6)
    if (semType === 1) { 
      // Sem I: Ends Nov 30 of Start Year
      const deadline = new Date(startYear, 10, 30, 23, 59, 59); 
      return now > deadline;
    }
    if (semType === 2) { 
      // Sem II: Ends May 31 of Next Year
      const deadline = new Date(startYear + 1, 4, 31, 23, 59, 59); 
      return now > deadline;
    }
    if (semType === 3) { 
      // Summer: Ends July 31 of Next Year
      const deadline = new Date(startYear + 1, 6, 31, 23, 59, 59); 
      return now > deadline;
    }
    return false; // Custom semesters have no restriction
  };

  // --- HANDLERS ---
  const onDecision = async (userId: string, semesterId: string, action: 'approve' | 'reject') => {
    await handleRegistration(userId, semesterId, action);
    loadDashboardData(); 
  };

  const handleCreateSemester = async () => {
    if (semType === 0 && !customName.trim()) {
      alert("Please enter a name for the custom semester.");
      return;
    }

    const res = await createSemester(startYear, semType, customName);
    if (res.success) {
      alert(res.message);
      loadDashboardData(); 
      setCustomName('');
      setSemType(1);
    } else {
      alert("Error: " + res.message);
    }
  };

  const handleDeleteSemester = async (semId: string) => {
    if (!confirm(`Are you sure you want to delete semester ${semId}?`)) return;
    const res = await deleteSemester(semId);
    if (res.success) {
      alert("Semester Deleted!");
      setSelectedSem(null);
      setView('list');
      loadDashboardData(); 
    } else {
      alert("FAILED: " + res.message);
    }
  };

  // =========================================================
  // VIEW 1: SEMESTER DETAIL VIEW
  // =========================================================

  // Inside ManageSemestersContent component
  const [isOfferingManagerOpen, setIsOfferingManagerOpen] = useState(false);
  const [allCatalogCourses, setAllCatalogCourses] = useState<any[]>([]);
  const [offeredInSem, setOfferedInSem] = useState<any[]>([]);
  const [courseSearch, setCourseSearch] = useState('');

  // Load offerings when a semester is opened or offerings are updated
  const loadOfferingData = async () => {
    if (!selectedSem) return;
    const [catalog, offerings] = await Promise.all([
      getCourses(), 
      getOpenCourses(selectedSem.sem_id)
    ]);
    setAllCatalogCourses(catalog);
    setOfferedInSem(offerings);
  };

  // Trigger data load when detail view opens
  useEffect(() => {
    if (view === 'detail') loadOfferingData();
  }, [view, selectedSem]);

  if (view === 'detail' && selectedSem) {
    // Filter for courses NOT yet offered in this semester
    const offeredIds = new Set(offeredInSem.map(o => o.course_id));
    const availableToOffer = allCatalogCourses.filter(c => 
      !offeredIds.has(c.course_id) && 
      (c.course_id + c.title).toLowerCase().includes(courseSearch.toLowerCase())
    );

    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        {/* HEADER SECTION (RETAINED) */}
        <div className="flex justify-between items-center">
          <button onClick={() => setView('list')} className="text-[10px] font-black text-slate-400 hover:text-slate-900 tracking-widest uppercase">← Back to Dashboard</button>
          <div className="flex gap-3">
              <button 
                onClick={() => setIsOfferingManagerOpen(!isOfferingManagerOpen)}
                className={`px-6 py-2 rounded-xl font-black text-[10px] transition-all shadow-md uppercase tracking-widest ${isOfferingManagerOpen ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'}`}
              >
                {isOfferingManagerOpen ? 'Close Manager' : '📂 Manage Course Offerings'}
              </button>
              <button 
                onClick={async () => {
                  const res = await toggleSemesterStatus(selectedSem.sem_id, selectedSem.is_active);
                  if (res.success) { setSelectedSem({...selectedSem, is_active: !selectedSem.is_active}); loadDashboardData(); }
                }} 
                className={`px-6 py-2 rounded-xl font-black text-[10px] shadow-md uppercase ${selectedSem.is_active ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}
              >
                {selectedSem.is_active ? 'Close Semester' : 'Open Semester'}
              </button>
          </div>
        </div>

        {!selectedSem.is_active && (
          <div className="mt-12 p-8 rounded-[2rem] bg-red-50/50 border border-red-100 flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-bottom-2">
            <div className="flex gap-4 items-center">
              <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-red-100">
                ⚠️
              </div>
              <div>
                <h3 className="font-black text-red-800 text-sm uppercase tracking-widest">Delete This Semester</h3>
                <p className="text-xs text-red-600/70 mt-0.5">
                  Deleting a semester is permanent and requires **zero** active registrations.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => handleDeleteSemester(selectedSem.sem_id)}
              className="w-full md:w-auto bg-white border border-red-200 text-red-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              Destroy Record
            </button>
          </div>
        )}

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <span className="text-8xl font-black uppercase tracking-tighter">{selectedSem.sem_id}</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{getSemesterDisplayName(selectedSem)}</h1>
          <p className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-widest">System Identifier: {selectedSem.sem_id}</p>

          {/* ---------------------------------------------------------
              NEW: OFFERING MANAGER (Conditional Section)
              --------------------------------------------------------- */}
          {isOfferingManagerOpen && (
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-6 duration-500">
              
              {/* COLUMN 1: CURRENTLY OFFERED */}
              <div className="space-y-4">
                  <div className="flex justify-between items-end">
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Currently Offered
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400">{offeredInSem.length} Courses</span>
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 space-y-2 max-h-[400px] overflow-y-auto">
                      {offeredInSem.map((o: any) => (
                          <div key={o.course_id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center group">
                              <div>
                                  <div className="font-mono font-black text-blue-600 text-xs">{o.course_id}</div>
                                  <div className="font-bold text-slate-700 text-sm leading-tight">{o.courses?.title}</div>
                              </div>
                              <button 
                                  onClick={async () => {
                                      await closeCourseForSemester(o.course_id, selectedSem.sem_id);
                                      loadOfferingData();
                                  }}
                                  className="opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all hover:bg-red-500 hover:text-white"
                              >
                                  Remove
                              </button>
                          </div>
                      ))}
                      {offeredInSem.length === 0 && <div className="py-10 text-center text-slate-400 italic text-xs">No courses offered yet.</div>}
                  </div>
              </div>

              {/* COLUMN 2: MASTER CATALOG (TO ADD) */}
              <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500"></span> Available in Catalog
                      </h3>
                      <input 
                          placeholder="Filter by ID or Name..." 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          value={courseSearch}
                          onChange={(e) => setCourseSearch(e.target.value)}
                      />
                  </div>
                  <div className="bg-blue-50/30 rounded-3xl p-4 border border-blue-50 space-y-2 max-h-[400px] overflow-y-auto">
                      {availableToOffer.map((c: any) => (
                          <div key={c.course_id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                              <div>
                                  <div className="font-mono font-black text-slate-400 text-xs">{c.course_id}</div>
                                  <div className="font-bold text-slate-800 text-sm leading-tight">{c.title}</div>
                              </div>
                              <button 
                                  onClick={async () => {
                                      const res = await openCourseForSemester(c.course_id, selectedSem.sem_id);
                                      if (res.success) loadOfferingData(); else alert(res.message);
                                  }}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                              >
                                  Offer
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
            </div>
          )}

          {/* DEFAULT DETAIL VIEW CONTENT (RETAINED) */}
          {!isOfferingManagerOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 animate-in fade-in">
                  <div className={`p-6 rounded-3xl border-2 ${selectedSem.is_active ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                      <h3 className="font-bold text-slate-800 mb-2">Academic Status</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                          {selectedSem.is_active 
                          ? "This session is currently ACTIVE. Registration is open for Students and Instructors." 
                          : "This session is ARCHIVED. It is closed for all new registration activities."}
                      </p>
                  </div>
                  <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 flex flex-col justify-center items-center text-center">
                      <span className="text-2xl font-black text-blue-600">{offeredInSem.length}</span>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active Course Offerings</span>
                  </div>
              </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 2: THE MAIN DASHBOARD LIST
  // =========================================================
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-black text-slate-800">Semester & Registrations</h2>
        <p className="text-slate-500">Approve incoming students and manage academic terms.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (2/3 width) - Registration & Approvals */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* BLOCK A: REGISTRATION APPROVALS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* 1. HEADER & TOGGLE SECTION */}
            <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                  Pending Approvals
                </h3>
                <select 
                  className="text-[10px] font-bold border rounded bg-white p-1 outline-none focus:border-blue-500"
                  value={activeSemId}
                  onChange={(e) => setActiveSemId(e.target.value)}
                >
                  <option value="ALL">🌍 All Semesters</option>
                  {semesters.map(s => <option key={s.sem_id} value={s.sem_id}>{s.sem_id}</option>)}
                </select>
              </div>
              
              {/* UNIFIED BEAUTIFUL TOGGLES */}
              <div className="flex flex-wrap items-center gap-6 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input type="checkbox" className="sr-only peer" checked={showStudents} onChange={() => setShowStudents(!showStudents)} />
                  <div className="w-10 h-5.5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-4.5 relative shadow-inner"></div>
                  <div className="ml-2 flex flex-col">
                    <span className="text-[8px] font-black uppercase text-slate-400 peer-checked:text-blue-600">Students</span>
                    <span className="text-[10px] font-bold text-slate-500">{pendingData.students.length}</span>
                  </div>
                </label>

                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                <label className="relative inline-flex items-center cursor-pointer group">
                  <input type="checkbox" className="sr-only peer" checked={showInstructors} onChange={() => setShowInstructors(!showInstructors)} />
                  <div className="w-10 h-5.5 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-4.5 relative shadow-inner"></div>
                  <div className="ml-2 flex flex-col">
                    <span className="text-[8px] font-black uppercase text-slate-400 peer-checked:text-purple-600">Faculty</span>
                    <span className="text-[10px] font-bold text-slate-500">{pendingData.instructors.length}</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 2. LIST CONTENT (UNIFIED BUTTONS) */}
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              
              {/* STUDENT LOOP */}
              {showStudents && pendingData.students.map((s: any) => (
                <div key={s.user_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center hover:border-blue-400 hover:shadow-md transition-all group">
                  <div className="flex gap-4 items-center w-full">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg group-hover:rotate-3 transition-transform">
                      {s.student_profile?.first_name?.[0] || 'S'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{s.student_profile ? `${s.student_profile.first_name} ${s.student_profile.last_name || ''}` : `ID: ${s.user_id}`}</h4>
                        <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border border-blue-100">Student</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        <span className="font-mono bg-slate-100 px-1 rounded text-slate-600 font-bold">{s.user_id}</span>
                        <span className="font-black text-blue-500 uppercase">{s.student_profile?.dept_id} • {s.student_profile?.degrees?.name || 'General'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* IDENTICAL BUTTONS FOR STUDENTS (SEMESTER-AWARE) */}
                  <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                    <button 
                      onClick={() => onDecision(s.user_id, s.semester_id, 'approve')} 
                      className="flex-1 md:flex-none bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 shadow-lg shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => onDecision(s.user_id, s.semester_id, 'reject')} 
                      className="flex-1 md:flex-none bg-white border border-red-100 text-red-500 px-6 py-2 rounded-xl text-[10px] font-black hover:bg-red-50 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={async () => {
                        const fees = await getFeeDetails(s.user_id, s.semester_id);
                        if (fees) {
                          alert(`FEE DETAILS:\nTXN: ${fees.transaction_no}\nAmount: ${fees.amount}\nDate: ${fees.date_of_transaction}`);
                        } else {
                          alert("No fee details found for this registration.");
                        }
                      }}
                      className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-blue-100 hover:bg-blue-100 transition-all"
                    >
                      View Fees
                    </button>
                  </div>

                  
                </div>
              ))}

              {/* FACULTY LOOP */}
              {showInstructors && pendingData.instructors.map((i: any) => (
                <div key={i.user_id} className="bg-white p-4 rounded-xl border-l-8 border-purple-600 shadow-sm flex flex-col md:flex-row justify-between items-center hover:shadow-md transition-all group">
                  <div className="flex gap-4 items-center w-full">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg group-hover:-rotate-3 transition-transform">
                      {i.instructor_profile?.first_name?.[0] || 'F'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{i.instructor_profile ? `${i.instructor_profile.first_name} ${i.instructor_profile.last_name || ''}` : `ID: ${i.user_id}`}</h4>
                        <span className="bg-purple-50 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-purple-100">Faculty</span>
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-purple-700 font-mono">
                        <span className="bg-purple-50 px-1 rounded">{i.user_id}</span>
                        <span className="text-slate-400 font-sans mx-2">|</span> 
                        <span className="text-slate-600">{i.instructor_profile?.departments?.dept_name || 'Assignment Pending'}</span>
                      </div>
                    </div>
                  </div>

                  {/* IDENTICAL BUTTONS FOR FACULTY (SEMESTER-AWARE) */}
                  <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                    <button 
                      onClick={() => onDecision(i.user_id, i.semester_id, 'approve')} 
                      className="flex-1 md:flex-none bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 shadow-lg shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => onDecision(i.user_id, i.semester_id, 'reject')} 
                      className="flex-1 md:flex-none bg-white border border-red-100 text-red-500 px-6 py-2 rounded-xl text-[10px] font-black hover:bg-red-50 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {/* EMPTY STATE */}
              {!pendingData.students.length && !pendingData.instructors.length && (
                <div className="py-16 text-center text-slate-400 italic text-xs">No pending requests found.</div>
              )}
            </div>
          </div>

          {/* BLOCK B: CREATE NEW SEMESTER (UPDATED) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">Create New Semester</h3>
            
            <div className="flex flex-col sm:flex-row items-end gap-4">
              
              {/* 1. ACADEMIC YEAR INPUT (Custom Stepper) */}
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-bold text-slate-500 mb-1">ACADEMIC YEAR</label>
                <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                  <button 
                    onClick={() => setStartYear(prev => prev - 1)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-r border-slate-300 transition-colors"
                  >
                    -
                  </button>
                  <div className="px-4 py-2 font-mono text-sm font-bold bg-white text-slate-800 min-w-[100px] text-center select-none">
                    {startYear}-{ (startYear + 1).toString().slice(-2) }
                  </div>
                  <button 
                    onClick={() => setStartYear(prev => prev + 1)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-l border-slate-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 2. Semester Type Dropdown */}
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-1">SEMESTER TYPE</label>
                <select 
                  value={semType}
                  onChange={(e) => setSemType(parseInt(e.target.value))}
                  className="w-full border border-slate-300 rounded p-2 text-sm bg-white h-[42px]"
                >
                  <option value={1}>I Semester of AY {startYear}-{(startYear + 1).toString().slice(-2)}</option>
                  <option value={2}>II Semester of AY {startYear}-{(startYear + 1).toString().slice(-2)}</option>
                  <option value={3}>Summer Semester {startYear + 1}</option>
                  <option value={0}>Custom / Other...</option>
                </select>
              </div>

              {/* 3. Custom Name Input (Only shows if type is Custom) */}
              {semType === 0 && (
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1">CUSTOM NAME</label>
                  <input 
                    type="text" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Winter Bootcamp"
                    className="w-full border border-slate-300 rounded p-2 text-sm h-[42px]"
                  />
                </div>
              )}

              {/* 4. Action Button with Validation State */}
              <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                <button 
                  onClick={handleCreateSemester} 
                  disabled={isCreationInvalid()}
                  className={`px-6 py-2 rounded font-bold text-sm transition-colors w-full h-[42px] ${
                    isCreationInvalid() 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300' 
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isCreationInvalid() ? 'EXPIRED' : 'CREATE'}
                </button>
              </div>
            </div>
            
            {/* 5. JUMP TO INPUT */}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-3">
               <label htmlFor="jumpInput" className="font-bold text-slate-500">Jump to:</label>
               <input 
                 id="jumpInput"
                 type="number" 
                 placeholder="YYYY"
                 className="border border-slate-300 rounded px-2 py-1 w-20 text-slate-700 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                 onChange={(e) => {
                   const val = parseInt(e.target.value);
                   // Sanity check: ensure year is reasonable (e.g., 1900-2999)
                   if (!isNaN(val) && val > 1900 && val < 3000) {
                     setStartYear(val);
                   }
                 }}
               />
               <span className="italic">(Enter start year to update stepper)</span>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN (1/3 width) - Ongoing Semesters List */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700">Ongoing Semesters</h3>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
              {semesters.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-400">No semesters found.</div>
              )}

              {semesters.map((sem) => (
                <button
                  key={sem.sem_id}
                  onClick={() => openSemesterDetails(sem)}
                  className="w-full text-left p-4 hover:bg-blue-50 rounded-lg group transition-colors border-b border-transparent hover:border-blue-100"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 group-hover:text-blue-700 text-sm">
                      {getSemesterDisplayName(sem)}
                    </span>
                    {sem.is_active && (
                      <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm mt-1 shrink-0 ml-2"></span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-mono truncate max-w-[150px]">{sem.sem_id}</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// =========================================================
// REFACTORED ADMIN LAYOUT
// =========================================================
function AdminDashboardLayout({ user, onLogout }: { user: any, onLogout: () => void }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'manage-departments', label: 'Departments', icon: '🏢' },
    { id: 'manage-degrees', label: 'Degrees', icon: '📜' },
    { id: 'manage-semesters', label: 'Semesters', icon: '🗓️' },
    { id: 'manage-people', label: 'People', icon: '👥' },
    { id: 'manage-courses', label: 'Courses', icon: '📚' },
  ];

  // Explicitly type as <string>
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aims_admin_active_tab');
      if (saved && navItems.find(n => n.id === saved)) {
        return saved;
      }
    }
    return 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('aims_admin_active_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">AIMS Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${
                activeTab === item.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg">LOGOUT</button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-full">
        {activeTab === 'dashboard' && <AdminDashboardContent user={user} />}
        {activeTab === 'manage-semesters' && <ManageSemestersContent user={user} />}
        {activeTab === 'manage-departments' && <ManageDepartmentsContent />}
        {activeTab === 'manage-degrees' && <ManageDegreesContent />}
        {activeTab === 'manage-people' && <ManagePeopleContent />}
        {activeTab === 'manage-courses' && <ManageCoursesContent />}
      </main>
    </div>
  );
}

// =========================================================
// 3. THE ENTRY PAGE (Login Check & Routing)
// =========================================================
export default function EntryPage() {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await getSessionAction();
        if (session.isLoggedIn) {
          setRole(session.role);
          
          // Fetch the profile immediately so the UI isn't stuck "Loading"
          if (session.role === 'instructor') {
            const profile = await getInstructorProfile(session.id);
            if (profile) setUser(profile); 
            else await logoutAction(); // Logout if profile was deleted
          } else if (session.role === 'student') {
            const profile = await getStudentProfile(session.id);
            if (profile) setUser(profile);
            else await logoutAction();
          } else {
            // Admins don't have a complex profile fetch in your current setup
            setUser({ admin_id: session.id });
          }
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await loginAction(id, pass);
    if (res.success) {
      setUser(res.user);
      setRole(res.role);
    } else {
      setError(res.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await logoutAction();
    setUser(null);
    setRole(null);
    setId('');
    setPass('');
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;

  // Inside EntryPage component:

  // 1. ADMIN VIEW
  if (role === 'admin') {
    return <AdminDashboardLayout user={user} onLogout={handleLogout} />;
  }

  // 2. INSTRUCTOR VIEW
  if (role === 'instructor') {
    return <InstructorPortal user={user} onLogout={handleLogout} />;
  }

  // 3. STUDENT VIEW
  if (role === 'student') {
    return <StudentPortal user={user} onLogout={handleLogout} />;
  }

  // 2. INSTRUCTOR VIEW (Simple Placeholder)
  if (role === 'instructor') {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold">Instructor View</h1>
        <button onClick={handleLogout} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      </div>
    );
  }

  // 3. STUDENT VIEW (Simple Placeholder)
  if (role === 'student') {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold">Student View</h1>
        <button onClick={handleLogout} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      </div>
    );
  }

  // 4. LOGIN FORM (Default)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-black tracking-tight text-slate-800 mb-6">AIMS LOGIN</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="User ID"
          />
          <input
            type="password"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Password"
          />
          {error && <div className="text-red-500 text-xs font-bold">{error}</div>}
          <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors">
            Verify Identity
          </button>
        </form>
      </div>
    </div>
  );
}
