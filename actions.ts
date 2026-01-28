'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

// 1. STANDARD CLIENT (For public reads/login)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 2. ADMIN CLIENT (For WRITES - Bypasses RLS)
// We use this because we manually check the cookie role in the code.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this is in your .env
)

type ActionResponse = 
  | { success: true; role: string; user: any; message?: string }
  | { success: false; message: string; role: null; user: null }

// --- AUTHENTICATION ---

export async function loginAction(id: string, pass: string): Promise<ActionResponse> {
  // Check password
  const { data: auth, error } = await supabaseAdmin
    .from('passwords')
    .select('user_id')
    .eq('user_id', id)
    .eq('password', pass)
    .single()

  if (error || !auth) {
    return { success: false, message: "Invalid credentials", role: null, user: null }
  }

  // Check which table the user belongs to
  const [admin, instructor, student] = await Promise.all([
    supabaseAdmin.from('admins').select('*').eq('admin_id', id).single(),
    supabaseAdmin.from('instructors').select('*').eq('ins_id', id).single(),
    supabaseAdmin.from('students').select('*').eq('stud_id', id).single()
  ])

  let userData = null
  let role = ''

  if (admin.data) { userData = admin.data; role = 'admin' }
  else if (instructor.data) { userData = instructor.data; role = 'instructor' }
  else if (student.data) { userData = student.data; role = 'student' }
  else {
    return { success: false, message: "No role assigned", role: null, user: null }
  }

  (await cookies()).set('aims_session', JSON.stringify({ id, role }), { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 60 * 60 * 24 
  })

  return { success: true, role, user: userData }
}

export async function getSessionAction() {
  const session = (await cookies()).get('aims_session')
  if (!session) return { isLoggedIn: false }
  const { id, role } = JSON.parse(session.value)
  return { isLoggedIn: true, id, role }
}

export async function logoutAction() {
  (await cookies()).delete('aims_session')
  return { success: true }
}

// --- SEMESTER LOGIC (ADMIN ONLY) ---

export async function createSemester(startYear: number, type: number, customLabel: string = '') {
  // 1. Security Check
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') {
    return { success: false, message: 'Unauthorized: Admin access required.' };
  }

  try {
    // ============================================================
    // 2. TEMPORAL VALIDATION (The "Time Machine" Check)
    // ============================================================
    const now = new Date();
    
    // Javascript Month Index: Jan=0, May=4, July=6, Nov=10
    let deadline: Date | null = null;
    let periodName = "";

    if (type === 1) { 
      // I Semester: Ends Nov 30th of startYear
      deadline = new Date(startYear, 10, 30, 23, 59, 59); 
      periodName = "November";
    } 
    else if (type === 2) { 
      // II Semester: Ends May 31st of (startYear + 1)
      deadline = new Date(startYear + 1, 4, 31, 23, 59, 59);
      periodName = "May";
    } 
    else if (type === 3) { 
      // Summer Semester: Ends July 31st of (startYear + 1)
      deadline = new Date(startYear + 1, 6, 31, 23, 59, 59);
      periodName = "July";
    }

    // If deadline exists and current time is past it -> BLOCK
    if (deadline && now > deadline) {
       return { 
         success: false, 
         message: `Creation Blocked: The window for this semester closed in ${periodName} ${deadline.getFullYear()}.` 
       };
    }
    // ============================================================

    // 3. ID Generation & Database Insert
    const endYear = startYear + 1;
    let sem_id = '';

    if (type === 1) sem_id = `${startYear}${endYear}1`; 
    else if (type === 2) sem_id = `${startYear}${endYear}2`; 
    else if (type === 3) sem_id = `${startYear}${endYear}3`; 
    else if (type === 0) { 
      if (!customLabel) return { success: false, message: "Custom semester name is required." };
      const slug = customLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      sem_id = `${startYear}_${slug}`;
    }

    const { error } = await supabaseAdmin.from('semesters').insert({
      sem_id: sem_id,
      year1: startYear,
      sem_no: type,
      custom_label: type === 0 ? customLabel : null,
      is_active: false 
    });

    if (error) {
      if (error.code === '23505') return { success: false, message: `Semester ID ${sem_id} already exists.` };
      return { success: false, message: error.message };
    }

    revalidatePath('/');
    return { success: true, message: `Created Semester: ${sem_id}` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteSemester(semId: string) {
  // 1. SECURITY: Check if Admin
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') {
    return { success: false, message: 'Unauthorized: Admin access required.' };
  }

  // 2. CONSTRAINT CHECK: Are there any registrations?
  // We use { head: true, count: 'exact' } to just get the number, not data.
  const { count, error: countError } = await supabaseAdmin
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('semester_id', semId)

  if (countError) {
    console.error("Delete Check Error:", countError);
    return { success: false, message: "Database error checking registrations." };
  }

  // If even 1 student or instructor is registered (pending or approved), BLOCK IT.
  if (count !== null && count > 0) {
    return { 
      success: false, 
      message: `Cannot delete: This semester has ${count} active registration(s).` 
    };
  }

  // 3. EXECUTE DELETE
  const { error: deleteError } = await supabaseAdmin
    .from('semesters')
    .delete()
    .eq('sem_id', semId)

  if (deleteError) {
    return { success: false, message: deleteError.message };
  }
  
  // 4. Refresh Data
  revalidatePath('/');
  return { success: true, message: 'Semester deleted successfully.' };
}

// --- REGISTRATION APPROVALS ---
export async function getPendingRegistrations(semesterId?: string) {
  // 1. Fetch raw registrations first (The Source of Truth)
  let query = supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('registration_status', 0);

  if (semesterId && semesterId !== 'ALL') {
    query = query.eq('semester_id', semesterId);
  }

  const { data: regs, error: regError } = await query;
  if (regError || !regs) return { students: [], instructors: [] };

  // 2. Collect IDs to fetch profiles for
  const studentIds = regs.filter(r => r.role === 'student').map(r => r.user_id);
  const instructorIds = regs.filter(r => r.role === 'instructor').map(r => r.user_id);

  // 3. Fetch profiles in parallel
  const [sProfiles, iProfiles] = await Promise.all([
    supabaseAdmin.from('students').select('*, degrees(name)').in('stud_id', studentIds),
    supabaseAdmin.from('instructors').select('*, departments(dept_name)').in('ins_id', instructorIds)
  ]);

  // 4. Map profiles back to the registration objects
  const students = regs
    .filter(r => r.role === 'student')
    .map(r => ({
      ...r,
      student_profile: sProfiles.data?.find(p => p.stud_id === r.user_id) || null
    }));

  const instructors = regs
    .filter(r => r.role === 'instructor')
    .map(r => ({
      ...r,
      instructor_profile: iProfiles.data?.find(p => p.ins_id === r.user_id) || null
    }));

  return { students, instructors };
}

// --- UPDATED REGISTRATION HANDLER in actions.ts ---
export async function handleRegistration(
  userId: string, 
  semesterId: string, // Add this parameter
  action: 'approve' | 'reject'
) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' }

  if (action === 'approve') {
    const { error } = await supabaseAdmin
      .from('registrations')
      .update({ registration_status: 1 })
      .eq('user_id', userId)
      .eq('semester_id', semesterId); // Target specific semester
    return { success: !error }
  } else {
    const { error } = await supabaseAdmin
      .from('registrations')
      .delete()
      .eq('user_id', userId)
      .eq('semester_id', semesterId) // Target specific semester
      .eq('registration_status', 0);
    return { success: !error }
  }
}

export async function getSemesters() {
  const { data, error } = await supabaseAdmin
    .from('semesters')
    .select('*')
    .order('year1', { ascending: false }) // Sort by year (newest first)
    .order('sem_no', { ascending: false }) 

  if (error) {
    console.error('Error fetching semesters:', error);
    return [];
  }
  return data || [];
}

// --- DEPARTMENT ACTIONS ---

export async function getDepartments() {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*')
    .order('dept_id', { ascending: true });

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
  return data || [];
}

export async function createDepartment(dept_id: string, dept_name: string) {
  // 1. Admin Check
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  // 2. Insert (Supabase enforces the UNIQUE constraint on DB level, but we catch it here)
  const { error } = await supabaseAdmin.from('departments').insert({
    dept_id,
    dept_name
  });

  if (error) {
    // Unique violation code is 23505
    if (error.code === '23505') {
      return { success: false, message: 'Department ID or Name already exists.' };
    }
    return { success: false, message: error.message };
  }

  revalidatePath('/');
  return { success: true, message: 'Department Created Successfully' };
}

export async function deleteDepartment(dept_id: string) {
  // 1. Admin Check
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  // 2. SAFETY CHECK: Check Students
  const { count: studentCount } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('dept_id', dept_id);

  if (studentCount && studentCount > 0) {
    return { success: false, message: `Cannot dissolve: ${studentCount} students belong to this department.` };
  }

  // 3. SAFETY CHECK: Check Instructors
  const { count: instructorCount } = await supabaseAdmin
    .from('instructors')
    .select('*', { count: 'exact', head: true })
    .eq('dept_id', dept_id);

  if (instructorCount && instructorCount > 0) {
    return { success: false, message: `Cannot dissolve: ${instructorCount} instructors belong to this department.` };
  }

  // 4. Delete
  const { error } = await supabaseAdmin
    .from('departments')
    .delete()
    .eq('dept_id', dept_id);

  if (error) return { success: false, message: error.message };

  revalidatePath('/');
  return { success: true, message: 'Department Dissolved' };
}

// ==========================================
// DEGREE MANAGEMENT ACTIONS
// ==========================================

export async function getDegrees() {
  const { data } = await supabaseAdmin.from('degrees').select('*').order('deg_id');
  return data || [];
}

export async function getDeptDegreeMatrix() {
  // Fetch all depts and their linked degrees
  const { data } = await supabaseAdmin
    .from('departments')
    .select(`
      dept_id, 
      dept_name,
      dept_degrees ( deg_id )
    `)
    .order('dept_id');
  return data || [];
}

export async function createDegree(degId: string, name: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  const { error } = await supabaseAdmin.from('degrees').insert({ deg_id: degId, name });
  
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Degree ID already exists.' };
    return { success: false, message: error.message };
  }
  revalidatePath('/');
  return { success: true, message: 'Degree Created' };
}

export async function dissolveDegree(degId: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  // CONSTRAINT 1: Cannot dissolve if any department offers it
  const { count } = await supabaseAdmin
    .from('dept_degrees')
    .select('*', { count: 'exact', head: true })
    .eq('deg_id', degId);

  if (count && count > 0) {
    return { success: false, message: `Cannot dissolve: ${count} departments are currently offering this degree.` };
  }

  // Safe to delete
  const { error } = await supabaseAdmin.from('degrees').delete().eq('deg_id', degId);
  if (error) return { success: false, message: error.message };
  
  revalidatePath('/');
  return { success: true, message: 'Degree Dissolved' };
}

// ==========================================
// MAPPING ACTIONS (Add/Remove Degree from Dept)
// ==========================================

export async function addDegreeToDept(deptId: string, degId: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  const { error } = await supabaseAdmin.from('dept_degrees').insert({ dept_id: deptId, deg_id: degId });
  
  if (error) return { success: false, message: error.message };
  revalidatePath('/');
  return { success: true, message: 'Degree Added to Department' };
}

export async function removeDegreeFromDept(deptId: string, degId: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  // CONSTRAINT 2: Cannot remove if students exist in this Dept + Degree combo
  const { count } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('dept_id', deptId)
    .eq('deg_id', degId);

  if (count && count > 0) {
    return { success: false, message: `Cannot Remove: ${count} students are enrolled in ${degId} under ${deptId}.` };
  }

  // Safe to remove
  const { error } = await supabaseAdmin
    .from('dept_degrees')
    .delete()
    .eq('dept_id', deptId)
    .eq('deg_id', degId);

  if (error) return { success: false, message: error.message };
  revalidatePath('/');
  return { success: true, message: 'Degree Removed from Department' };
}

// ==========================================
// PEOPLE MANAGEMENT
// ==========================================

export async function getPeople() {
  // 1. Fetch Students
  // Added joining_year if it exists in your schema, otherwise we rely on ID
  const { data: students } = await supabaseAdmin
    .from('students')
    .select(`
      stud_id, first_name, last_name, status, dept_id, deg_id,
      departments(dept_name),
      degrees(name)
    `)
    .order('stud_id');

  // 2. Fetch Instructors
  // UPDATED: Changed 'name' to 'first_name, last_name' and added 'joining_year'
  const { data: instructors } = await supabaseAdmin
    .from('instructors')
    .select(`
      ins_id, first_name, last_name, status, dept_id, joining_year,
      departments(dept_name)
    `)
    .order('ins_id');

  return { 
    students: students || [], 
    instructors: instructors || [] 
  };
}

// Helper to calculate the next sequence number
async function getNextSequence(year: number, degId: string) {
  // We need to count how many students exist for this Year + Degree combination
  // regardless of their department.
  // We assume stud_id starts with the Year.
  
  const { count, error } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('deg_id', degId)
    .ilike('stud_id', `${year}%`); // Filter IDs starting with the Year

  if (error) throw new Error(error.message);
  
  // If count is 5, the next one is 6.
  return (count || 0) + 1;
}

// ==========================================
// CORRECTED: ADD SINGLE STUDENT
// ==========================================
// In actions.ts

/** ACTION: Add a single student with an assigned advisor */
export async function addStudent(data: any) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  try {
    // 1. CONSISTENCY CHECK: Does the Dept offer this Degree?
    const { data: offerCheck, error: checkError } = await supabaseAdmin
      .from('dept_degrees')
      .select('dept_id')
      .eq('dept_id', data.dept_id)
      .eq('deg_id', data.deg_id)
      .single();

    if (checkError || !offerCheck) {
      return { 
        success: false, 
        message: `Consistency Error: The department '${data.dept_id}' does not offer the degree '${data.deg_id}'.` 
      };
    }

    const year = data.year || new Date().getFullYear();
    const seqNum = await getNextSequence(year, data.deg_id);
    const seqStr = seqNum.toString().padStart(4, '0');
    
    // Generate ID: Year + Dept + Degree + Seq
    const finalId = `${year}${data.dept_id}${data.deg_id}${seqStr}`;

    // 2. Insert into PASSWORDS first
    const { error: pwError } = await supabaseAdmin.from('passwords').insert({
      user_id: finalId,
      password: finalId 
    });

    if (pwError) throw new Error(`Auth Error: ${pwError.message}`);

    // 3. Insert into STUDENTS with advisor_id
    const { error: sError } = await supabaseAdmin.from('students').insert({
      stud_id: finalId,
      first_name: data.first_name,
      last_name: data.last_name || null,
      dept_id: data.dept_id,
      deg_id: data.deg_id,
      advisor_id: data.advisor_id, // NEW: Assign advisor at creation
      status: 'active'
    });

    if (sError) {
      await supabaseAdmin.from('passwords').delete().eq('user_id', finalId);
      throw new Error(`Student Profile Error: ${sError.message}`);
    }

    revalidatePath('/');
    return { success: true, message: `Student Added: ${finalId}` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/** ACTION: Batch import students with a shared advisor */
export async function batchImportStudents(students: any[]) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  students.sort((a, b) => (a.first_name + a.last_name).localeCompare(b.first_name + b.last_name));

  const groups: Record<string, any[]> = {};
  for (const s of students) {
    const key = `${s.year}-${s.deg_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  let totalAdded = 0;

  for (const key in groups) {
    const groupList = groups[key];
    const [yearStr, degId] = key.split('-');
    const year = parseInt(yearStr);
    let currentSeq = await getNextSequence(year, degId);

    const passwordRows: any[] = [];
    const studentRows: any[] = [];

    groupList.forEach((s) => {
      const seqStr = currentSeq.toString().padStart(4, '0');
      const finalId = `${year}${s.dept_id}${degId}${seqStr}`;
      currentSeq++;

      passwordRows.push({ user_id: finalId, password: finalId });
      studentRows.push({
        stud_id: finalId,
        first_name: s.first_name,
        last_name: s.last_name,
        dept_id: s.dept_id,
        deg_id: degId,
        advisor_id: s.advisor_id, // NEW: Assign advisor in batch
        status: 'active'
      });
    });

    const { error: pwError } = await supabaseAdmin.from('passwords').insert(passwordRows);
    if (pwError) continue;

    const { error: sError } = await supabaseAdmin.from('students').insert(studentRows);
    if (sError) {
      const idsToRemove = passwordRows.map(p => p.user_id);
      await supabaseAdmin.from('passwords').delete().in('user_id', idsToRemove);
      continue;
    }
    totalAdded += studentRows.length;
  }

  revalidatePath('/');
  return { success: true, message: `Imported ${totalAdded} students.` };
}

export async function addInstructor(data: any) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  if (!data.dept_id) {
    return { success: false, message: 'Department is required for ID generation.' };
  }

  try {
    // UPDATED: Pass both year AND dept_id to the RPC function
    const { data: newId, error: idError } = await supabaseAdmin
      .rpc('get_next_instructor_id', { 
        target_year: data.year, 
        target_dept_id: data.dept_id 
      });

    if (idError) throw new Error(`ID Generation Error: ${idError.message}`);

    // Insert into PASSWORDS (FK Requirement)
    const { error: pwError } = await supabaseAdmin.from('passwords').insert({
      user_id: newId,
      password: newId 
    });

    if (pwError) throw new Error(`Auth Error: ${pwError.message}`);

    // Insert into INSTRUCTORS
    const { error: iError } = await supabaseAdmin.from('instructors').insert({
      ins_id: newId as string,
      first_name: data.first_name,
      last_name: data.last_name,
      dept_id: data.dept_id,
      joining_year: data.year,
      status: data.status || 'active'
    });

    if (iError) {
      // Rollback
      await supabaseAdmin.from('passwords').delete().eq('user_id', newId);
      throw new Error(iError.message);
    }

    revalidatePath('/');
    return { success: true, message: `Instructor Added: ${data.first_name} (${newId})` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 4. Update Status (The "Remove" Logic)
export async function updateUserStatus(userId: string, role: 'student' | 'instructor', newStatus: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  const table = role === 'student' ? 'students' : 'instructors';
  const idCol = role === 'student' ? 'stud_id' : 'ins_id';

  const { error } = await supabaseAdmin
    .from(table)
    .update({ status: newStatus })
    .eq(idCol, userId);

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/');
  return { success: true, message: `User marked as ${newStatus}` };
}

// 5. Batch Update Status
export async function batchUpdateUserStatus(userIds: string[], role: 'student' | 'instructor', newStatus: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  if (!userIds || userIds.length === 0) return { success: false, message: 'No users selected.' };

  const table = role === 'student' ? 'students' : 'instructors';
  const idCol = role === 'student' ? 'stud_id' : 'ins_id';

  // Update all IDs in the list at once
  const { error } = await supabaseAdmin
    .from(table)
    .update({ status: newStatus })
    .in(idCol, userIds);

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/');
  return { success: true, message: `Successfully updated ${userIds.length} users.` };
}

interface StudentImportData {
  first_name: string;
  last_name: string;
  dept_id: string;
  deg_id: string;
  year: number; // Joining Year
}

// ... existing imports

// --- COURSE CATEGORY MANAGEMENT (NEW) ---

export async function getCourseCategories() {
  const { data } = await supabaseAdmin.from('course_categories').select('*').order('cat_id');
  return data || [];
}

export async function createCourseCategory(cat_id: string, name: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  const normalizedId = cat_id.toUpperCase();

  // 1. COLLISION CHECK: Check if this ID is already used by a Department
  // We cannot have a category 'CS' if there is already a department 'CS'
  const { data: deptCheck } = await supabaseAdmin
    .from('departments')
    .select('dept_id')
    .eq('dept_id', normalizedId)
    .single();

  if (deptCheck) {
    return { 
      success: false, 
      message: `Conflict: '${normalizedId}' is already a registered Department. You cannot use it as a Category.` 
    };
  }

  // 2. Insert into Categories
  const { error } = await supabaseAdmin
    .from('course_categories')
    .insert({ 
      cat_id: normalizedId, 
      name 
    });
  
  if (error) {
    // Unique violation code (checked against existing categories)
    if (error.code === '23505') return { success: false, message: 'Category ID already exists.' };
    return { success: false, message: error.message };
  }

  revalidatePath('/');
  return { success: true, message: 'Category Created Successfully' };
}

export async function deleteCourseCategory(cat_id: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  // CONSTRAINT: Destroyable IF AND ONLY IF no course exists
  const { count } = await supabaseAdmin
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('prefix', cat_id); // Check if any course uses this prefix

  if (count && count > 0) {
    return { success: false, message: `Cannot delete: ${count} courses are using the '${cat_id}' category.` };
  }

  const { error } = await supabaseAdmin.from('course_categories').delete().eq('cat_id', cat_id);
  if (error) return { success: false, message: error.message };
  
  revalidatePath('/');
  return { success: true, message: 'Category Deleted' };
}

// --- COURSE MANAGEMENT (UPDATED) ---

// Update getCourses to fetch properly
export async function getCourses() {
  const { data } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      departments (dept_name)
    `)
    .order('prefix')
    .order('course_id');
  return data || [];
}

// --- NEW HELPER: Fetch Available Numbers ---
export async function getAvailableNumbers(prefix: string, level: number) {
  // Call the new RPC function
  const { data, error } = await supabaseAdmin
    .rpc('get_available_course_numbers', { 
      target_prefix: prefix, 
      target_level: level 
    });

  if (error) {
    console.error("Error fetching numbers:", error);
    return [];
  }
  // data is an array of objects: [{ num: 1 }, { num: 2 }...]
  return data.map((row: any) => row.num) as number[];
}

// --- UPDATED CREATE COURSE ---
export async function createCourse(data: any) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  try {
    const { prefix, dept_id, title, category, course_no, l, t, p, s } = data;

    // 1. Construct the ID manually (Prefix + Category + Padded Number)
    // e.g., CS + 5 + 09 = CS509
    const courseId = `${prefix}${category}${course_no.toString().padStart(2, '0')}`;

    // 2. Insert Course
    const { error } = await supabaseAdmin
      .from('courses')
      .insert({
        course_id: courseId,
        prefix: prefix,
        dept_id: dept_id || null,
        title,
        category: parseInt(category),
        course_no: parseInt(course_no), // Use the manual number
        l: parseFloat(l),
        t: parseFloat(t),
        p: parseFloat(p),
        s: parseFloat(s)
      });

    if (error) {
       // Handle race condition if someone else took the number in the meantime
       if (error.code === '23505') return { success: false, message: `Course ID ${courseId} already exists.` };
       throw new Error(error.message);
    }

    revalidatePath('/');
    return { success: true, message: `Course Created: ${courseId}` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ==========================================================
// USER PORTAL ACTIONS (Student/Instructor)
// ==========================================================

/** Fetch detailed student profile with joined metadata */
export async function getStudentProfile(id: string) {
  const { data } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      departments(dept_name),
      degrees(name)
    `)
    .eq('stud_id', id)
    .single();
  return data;
}

/** Fetch detailed instructor profile with joined metadata */
export async function getInstructorProfile(id: string) {
  const { data } = await supabaseAdmin
    .from('instructors')
    .select(`
      *,
      departments(dept_name)
    `)
    .eq('ins_id', id)
    .single();
  return data;
}

/** Fetch all semesters currently marked as active */
export async function getActiveSemesters() {
  const { data } = await supabaseAdmin
    .from('semesters')
    .select('*')
    .eq('is_active', true)
    .order('year1', { ascending: false });
  return data || [];
}

/** Fetch all registration entries for a specific user to check status across active sems */
export async function getMyRegistrations(userId: string) {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}

/** Apply for registration in a specific active semester */
export async function registerForSemester(userId: string, semesterId: string, role: 'student' | 'instructor') {
  const { error } = await supabaseAdmin
    .from('registrations')
    .insert({
      user_id: userId,
      semester_id: semesterId,
      role: role,
      registration_status: 0 // 0 = Pending
    });

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/');
  return { success: true, message: 'Registration request submitted for approval.' };
}

// ==========================================================
// ADMIN DASHBOARD ACTIONS
// ==========================================================

/** Fetch high-level system statistics for the Admin Dashboard */
export async function getSystemStats() {
  const [depts, courses, students, instructors, activeSems] = await Promise.all([
    supabaseAdmin.from('departments').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('students').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('instructors').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('semesters').select('*', { count: 'exact', head: true }).eq('is_active', true)
  ]);

  return {
    deptCount: depts.count || 0,
    courseCount: courses.count || 0,
    studentCount: students.count || 0,
    facultyCount: instructors.count || 0,
    activeSemCount: activeSems.count || 0
  };
}

// ==========================================================
// SEMESTER STATUS MANAGEMENT (ADMIN ONLY)
// ==========================================================

/** Toggle a semester between Open (Active) and Closed (Inactive) */
export async function toggleSemesterStatus(semId: string, currentStatus: boolean) {
  const sessionString = (await cookies()).get('aims_session')?.value;
  const session = sessionString ? JSON.parse(sessionString) : {};
  
  if (session.role !== 'admin') {
    return { success: false, message: 'Unauthorized: Admin access required.' };
  }

  const { error } = await supabaseAdmin
    .from('semesters')
    .update({ is_active: !currentStatus })
    .eq('sem_id', semId);

  if (error) return { success: false, message: error.message };

  revalidatePath('/');
  return { 
    success: true, 
    message: `Semester ${semId} is now ${!currentStatus ? 'OPEN' : 'CLOSED'}.` 
  };
}

// ==========================================
// OPEN COURSES MANAGEMENT (NEW)
// ==========================================

/** Fetch all courses offered in a specific semester */
export async function getOpenCourses(semId: string) {
  const { data, error } = await supabaseAdmin
    .from('open_courses')
    .select(`
      course_id,
      courses (
        title,
        prefix,
        category,
        course_no,
        l, t, p, s,
        departments (dept_name)
      )
    `)
    .eq('sem_id', semId);

  if (error) {
    console.error("Error fetching open courses:", error);
    return [];
  }
  return data || [];
}

/** Open a course for a specific semester */
export async function openCourseForSemester(courseId: string, semId: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  const { error } = await supabaseAdmin
    .from('open_courses')
    .insert({ course_id: courseId, sem_id: semId });

  if (error) {
    if (error.code === '23505') return { success: false, message: 'Course is already open for this semester.' };
    return { success: false, message: error.message };
  }

  revalidatePath('/');
  return { success: true, message: 'Course opened successfully.' };
}

/** Remove a course from a semester's offerings */
export async function closeCourseForSemester(courseId: string, semId: string) {
  const session = JSON.parse((await cookies()).get('aims_session')?.value || '{}');
  if (session.role !== 'admin') return { success: false, message: 'Unauthorized' };

  const { error } = await supabaseAdmin
    .from('open_courses')
    .delete()
    .eq('course_id', courseId)
    .eq('sem_id', semId);

  if (error) return { success: false, message: error.message };

  revalidatePath('/');
  return { success: true, message: 'Course removed from semester.' };
}

/** Fetch courses offered in a specific semester using the open_courses table */
export async function getSemesterCourses(semesterId: string) {
  const { data, error } = await supabaseAdmin
    .from('open_courses') // This is your bridge table
    .select(`
      course_id,
      courses!inner (
        title,
        credits,
        l, t, p, s,
        departments (dept_name)
      )
    `)
    .eq('semester_id', semesterId);

  if (error) {
    console.error("Error fetching courses for semester:", error);
    return [];
  }

  // Flatten the response so it's easier to use in your UI
  return data.map(item => ({
    course_id: item.course_id,
    ...item.courses
  }));
}

/** Submit fees and ensure a registration record exists without duplicates */
export async function submitFeesAndRegister(feeData: {
  stud_id: string;
  semester_id: string;
  transaction_no: string;
  amount: number;
  date_of_transaction: string;
}) {
  // 1. "Upsert" the registration: This creates the record if it's missing,
  // but does nothing if (user_id, semester_id) already exists.
  const { error: regError } = await supabaseAdmin
    .from('registrations')
    .upsert(
      {
        user_id: feeData.stud_id,
        semester_id: feeData.semester_id,
        role: 'student',
        registration_status: 0 // Keep it pending
      }, 
      { onConflict: 'user_id,semester_id' } // This matches your error constraint
    );

  if (regError) return { success: false, message: "Registration sync failed: " + regError.message };

  // 2. Upsert the fee record: This allows students to correct their 
  // transaction info if they made a mistake previously.
  const { error: feeError } = await supabaseAdmin
    .from('fees')
    .upsert({
      stud_id: feeData.stud_id,
      semester_id: feeData.semester_id,
      transaction_no: feeData.transaction_no,
      amount: feeData.amount,
      date_of_transaction: feeData.date_of_transaction
    });

  if (feeError) return { success: false, message: "Fee sync failed: " + feeError.message };

  return { success: true, message: "Details submitted successfully!" };
}

/** Fetch fee details for a specific student and semester */
export async function getFeeDetails(studId: string, semId: string) {
  const { data, error } = await supabaseAdmin
    .from('fees')
    .select('*')
    .eq('stud_id', studId)
    .eq('semester_id', semId)
    .single();

  return data || null;
}

/** Fetch all fee entries for a specific student */
export async function getMyFeeHistory(studId: string) {
  const { data, error } = await supabaseAdmin
    .from('fees')
    .select(`
      *,
      semesters (*) 
    `)
    .eq('stud_id', studId)
    .order('date_of_transaction', { ascending: false });

  if (error) return [];
  return data;
}

/** ENROLLMENT: Student joins a course */
export async function enrollStudentInCourse(studId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('takes')
    .insert({ stud_id: studId, course_id: courseId, sem_id: semId });

  if (error) return { success: false, message: "Enrollment failed: " + error.message };
  return { success: true, message: "Enrolled successfully!" };
}

/** TEACHING: Admin assigns an instructor to a course */
export async function assignInstructorToCourse(insId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('teaches')
    .insert({ ins_id: insId, course_id: courseId, sem_id: semId });

  if (error) return { success: false, message: "Assignment failed: " + error.message };
  return { success: true, message: "Faculty assigned successfully!" };
}

/** GRADING: Instructor posts a grade for a student */
export async function postStudentGrade(studId: string, courseId: string, semId: string, grade: string) {
  const { error } = await supabaseAdmin
    .from('takes')
    .update({ grade: grade })
    .match({ stud_id: studId, course_id: courseId, sem_id: semId });

  if (error) return { success: false, message: "Grading failed: " + error.message };
  return { success: true, message: "Grade posted!" };
}

/** FETCH: Get courses with APPROVED instructors for a student's approved semesters */
export async function getAvailableOpenCourses(studId: string) {
  // 1. Verify student has an APPROVED registration for the semester
  const { data: approvedRegs } = await supabaseAdmin
    .from('registrations')
    .select('semester_id')
    .eq('user_id', studId)
    .eq('registration_status', 1); 

  if (!approvedRegs || approvedRegs.length === 0) return [];
  const approvedIds = approvedRegs.map(r => r.semester_id);

  // 2. Fetch from 'teaches' where faculty is APPROVED (status 1)
  const { data, error } = await supabaseAdmin
    .from('teaches')
    .select(`
      course_id,
      sem_id,
      instructors (first_name, last_name),
      courses (title, credits)
    `)
    .in('sem_id', approvedIds)
    .eq('status', 1);

  if (error) return [];

  // 3. Subtract courses already in the 'takes' table (enrolled or pending)
  const { data: currentTakes } = await supabaseAdmin
    .from('takes')
    .select('course_id, sem_id')
    .eq('stud_id', studId);

  const takenKeys = new Set(currentTakes?.map(t => `${t.course_id}-${t.sem_id}`));

  return data.filter(course => !takenKeys.has(`${course.course_id}-${course.sem_id}`));
}

/** FETCH: Available slots for instructors ONLY if they are registered for that sem */
export async function getAvailableTeachingSlots(semId: string, insId: string) {
  // Check if instructor is approved for this specific semester first
  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('id')
    .match({ user_id: insId, semester_id: semId, registration_status: 1 })
    .single();

  if (!reg) return []; // Block access if not registered

  const { data: open } = await supabaseAdmin
    .from('open_courses')
    .select(`course_id, courses (title, credits)`)
    .eq('sem_id', semId);

  return open || [];
}

/** INSTRUCTOR: Request to teach (Sets status to 0) */
export async function requestToTeach(insId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('teaches')
    .insert({ ins_id: insId, course_id: courseId, sem_id: semId, status: 0 });
  
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Teaching request sent to Admin!" };
}

/** ADMIN: Approve Instructor's request (Sets status to 1) */
export async function approveTeachingRequest(insId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('teaches')
    .update({ status: 1 })
    .match({ ins_id: insId, course_id: courseId, sem_id: semId });

  if (error) return { success: false, message: error.message };
  return { success: true, message: "Instructor approved for this course." };
}

/** FETCH: Get current student load with updated approval status */
export async function getMyEnrolledCourses(studId: string) {
  const { data, error } = await supabaseAdmin
    .from('takes')
    .select(`
      course_id,
      sem_id,
      status,
      grade,
      courses (title, credits)
    `)
    .eq('stud_id', studId);

  if (error) return [];
  return data;
}

/** ACTION: Request enrollment */
export async function requestEnrollment(studId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('takes')
    .insert({ stud_id: studId, course_id: courseId, sem_id: semId, status: 0 });

  if (error) return { success: false, message: error.message };
  
  // Force server-side cache refresh
  revalidatePath('/'); 
  return { success: true, message: "Request sent!" };
}

/** FETCH: Get courses assigned to a specific instructor with status */
export async function getInstructorAssignments(insId: string) {
  const { data, error } = await supabaseAdmin
    .from('teaches')
    .select(`
      course_id,
      sem_id,
      status, 
      courses (title, credits),
      semesters (*)
    `)
    .eq('ins_id', insId)
    .order('status', { ascending: false }); // Show running courses first

  if (error) return [];
  return data;
}

/** FETCH: All teaching requests that are not yet approved */
export async function getTeachingRequests() {
  const { data, error } = await supabaseAdmin
    .from('teaches')
    .select(`
      *,
      courses (title, credits),
      instructors (first_name, last_name),
      semesters (*)
    `)
    .eq('status', 0); // 0 = Pending

  if (error) return [];
  return data;
}

/** ACTION: Approve or Reject a teaching request */
export async function handleTeachingRequest(insId: string, courseId: string, semId: string, action: 'approve' | 'reject') {
  if (action === 'approve') {
    const { error } = await supabaseAdmin
      .from('teaches')
      .update({ status: 1 })
      .match({ ins_id: insId, course_id: courseId, sem_id: semId });
    if (error) return { success: false, message: error.message };
  } else {
    const { error } = await supabaseAdmin
      .from('teaches')
      .delete()
      .match({ ins_id: insId, course_id: courseId, sem_id: semId });
    if (error) return { success: false, message: error.message };
  }
  return { success: true, message: `Request ${action}ed.` };
}

/** FETCH: Student enrollment requests for courses assigned to this instructor */
export async function getInstructorPendingStudents(insId: string) {
  // 1. Get the instructor's approved course assignments
  const { data: myCourses } = await supabaseAdmin
    .from('teaches')
    .select('course_id, sem_id')
    .eq('ins_id', insId)
    .eq('status', 1);

  if (!myCourses || myCourses.length === 0) return [];

  // 2. Fetch pending students (status 0) for these specific courses
  const { data, error } = await supabaseAdmin
    .from('takes')
    .select(`
      *,
      students (first_name, last_name, dept_id),
      courses (title)
    `)
    .eq('status', 0); // 0 = Pending Approval

  if (error) return [];

  // 3. Filter only for courses this instructor is actually teaching
  return data.filter(d => 
    myCourses.some(mc => mc.course_id === d.course_id && mc.sem_id === d.sem_id)
  );
}

/** ACTION: Remove a student's enrollment request */
export async function rejectEnrollment(studId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('takes')
    .delete()
    .match({ stud_id: studId, course_id: courseId, sem_id: semId });

  if (error) return { success: false, message: error.message };
  return { success: true, message: "Request removed." };
}

/** FETCH: Get students awaiting advisor approval (1) OR fully enrolled (2) */
export async function getCourseRoster(courseId: string, semId: string) {
  const { data, error } = await supabaseAdmin
    .from('takes')
    .select(`
      stud_id,
      grade,
      status,
      students (first_name, last_name, dept_id)
    `)
    .match({ course_id: courseId, sem_id: semId })
    .in('status', [1, 2]); // FIXED: Fetch both pending advisor and enrolled

  if (error) return [];
  return data;
}

/** ACTION: Update a student's grade and trigger a portal refresh */
export async function updateStudentGrade(studId: string, course_id: string, sem_id: string, grade: string) {
  // Mapping based on institutional rules
  const gradeMap: Record<string, number> = {
    'A': 10, 'A-': 9, 'B': 8, 'B-': 7, 'C': 6, 'C-': 5, 'D': 4, 
    'E': 2, // Included in SGPA points
    'F': 0, // Included in SGPA points
    'W': 0  // Withdrawn
  };
  
  const points = grade ? gradeMap[grade] : null;

  const { error } = await supabaseAdmin
    .from('takes')
    .update({ 
      grade: grade, 
      grade_points: points // Synchronized for GPA logic
    }) 
    .match({ stud_id: studId, course_id: course_id, sem_id: sem_id });

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/'); 
  return { success: true, message: `Grade ${grade} assigned.` };
}

/** FETCH: Full academic history for a student grouped by semester */
export async function getStudentRecord(studId: string) {
  const { data, error } = await supabaseAdmin
    .from('takes')
    .select(`
      course_id,
      sem_id,
      grade,
      grade_points,
      status,
      courses (title, credits, prefix),
      semesters (*)
    `)
    .eq('stud_id', studId)
    .order('sem_id', { ascending: false });

  if (error) {
    console.error("Error fetching student record:", error);
    return [];
  }
  return data || [];
}

/** ACTION: Course Instructor approves student (Sets status 0 -> 1) */
export async function approveStudentEnrollment(studId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('takes')
    .update({ status: 1 }) // FIXED: Move to Awaiting Advisor
    .match({ stud_id: studId, course_id: courseId, sem_id: semId });

  if (error) return { success: false, message: error.message };
  revalidatePath('/');
  return { success: true, message: "Instructor approval complete. Sent to Advisor." };
}

/** ACTION: Faculty Advisor finalizes enrollment (Sets status 1 -> 2) */
export async function advisorApproveEnrollment(studId: string, courseId: string, semId: string) {
  const { error } = await supabaseAdmin
    .from('takes')
    .update({ status: 2 }) // FIXED: Move to Fully Enrolled
    .match({ stud_id: studId, course_id: courseId, sem_id: semId });

  if (error) return { success: false, message: error.message };
  revalidatePath('/');
  return { success: true, message: "Advisor verification complete. Student enrolled." };
}

/** FETCH: Get all students where this instructor is the advisor */
export async function getAdvisedStudents(insId: string) {
  const { data } = await supabaseAdmin
    .from('students')
    .select('*, departments(dept_name), degrees(name)')
    .eq('advisor_id', insId);
  return data || [];
}

/** FETCH: Get requests waiting for Advisor approval (status 1) */
export async function getAdvisorPendingRequests(insId: string) {
  const { data, error } = await supabaseAdmin
    .from('takes')
    .select(`
      *,
      students!inner(first_name, last_name, advisor_id),
      courses(title)
    `)
    .eq('status', 1) // FIXED: Specifically target instructor-approved requests
    .eq('students.advisor_id', insId);

  if (error) return [];
  return data || [];
}
