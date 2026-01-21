// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.message || 'Request failed' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

// Auth API
export const authAPI = {
    sendOTP: async (email: string, role: string, name?: string) => {
        return fetchAPI<{ message: string; userExists?: boolean; role?: string }>('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email, role, name }),
        });
    },

    verifyOTP: async (email: string, otp: string, role: string, name?: string) => {
        return fetchAPI<{
            message: string;
            user: {
                id: string;
                email: string;
                name: string;
                role: string;
                department: string;
            };
        }>('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp, role, name }),
        });
    },

    getUser: async (email: string) => {
        return fetchAPI<{
            user: {
                id: string;
                email: string;
                name: string;
                role: string;
                department: string;
            };
        }>(`/auth/user/${email}`);
    },
};

// Courses API
export const coursesAPI = {
    getAll: async () => {
        return fetchAPI<{ courses: Course[] }>('/courses');
    },

    getOpen: async () => {
        return fetchAPI<{ courses: Course[] }>('/courses/open');
    },

    getById: async (id: string) => {
        return fetchAPI<{ course: Course }>(`/courses/${id}`);
    },

    create: async (course: Partial<Course>) => {
        return fetchAPI<{ course: Course }>('/courses', {
            method: 'POST',
            body: JSON.stringify(course),
        });
    },

    update: async (id: string, data: Partial<Course>) => {
        return fetchAPI<{ course: Course }>(`/courses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    toggleStatus: async (id: string) => {
        return fetchAPI<{ isOpen: boolean }>(`/courses/${id}/toggle-status`, {
            method: 'PATCH',
        });
    },

    delete: async (id: string) => {
        return fetchAPI<{ message: string }>(`/courses/${id}`, {
            method: 'DELETE',
        });
    },
};

// Enrollments API
export const enrollmentsAPI = {
    create: async (studentId: string, courseId: string, advisorId?: string) => {
        return fetchAPI<{ enrollment: Enrollment; message: string }>('/enrollments', {
            method: 'POST',
            body: JSON.stringify({ studentId, courseId, advisorId }),
        });
    },

    getForStudent: async (studentId: string) => {
        return fetchAPI<{ enrollments: Enrollment[] }>(`/enrollments/student/${studentId}`);
    },

    getForInstructor: async (instructorId: string) => {
        return fetchAPI<{ enrollments: Enrollment[] }>(`/enrollments/instructor/${instructorId}`);
    },

    getForAdvisor: async (advisorId: string) => {
        return fetchAPI<{ enrollments: Enrollment[] }>(`/enrollments/advisor/${advisorId}`);
    },

    instructorAction: async (id: string, action: 'approve' | 'reject', remarks?: string) => {
        return fetchAPI<{ enrollment: Enrollment }>(`/enrollments/${id}/instructor-action`, {
            method: 'PATCH',
            body: JSON.stringify({ action, remarks }),
        });
    },

    advisorAction: async (id: string, action: 'approve' | 'reject', remarks?: string) => {
        return fetchAPI<{ enrollment: Enrollment }>(`/enrollments/${id}/advisor-action`, {
            method: 'PATCH',
            body: JSON.stringify({ action, remarks }),
        });
    },

    getAll: async () => {
        return fetchAPI<{ enrollments: Enrollment[] }>('/enrollments');
    },

    withdraw: async (id: string) => {
        return fetchAPI<{ enrollment: Enrollment }>(`/enrollments/${id}/withdraw`, {
            method: 'PATCH',
        });
    },
};

// Users API
export const usersAPI = {
    getAll: async () => {
        return fetchAPI<{ users: User[] }>('/users');
    },

    getByRole: async (role: string) => {
        return fetchAPI<{ users: User[] }>(`/users/role/${role}`);
    },

    create: async (user: { email: string; name: string; role: string; department?: string }) => {
        return fetchAPI<{ user: User }>('/users', {
            method: 'POST',
            body: JSON.stringify(user),
        });
    },

    update: async (id: string, data: Partial<User>) => {
        return fetchAPI<{ user: User }>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: string) => {
        return fetchAPI<{ message: string }>(`/users/${id}`, {
            method: 'DELETE',
        });
    },
};

// Types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'instructor' | 'advisor' | 'admin';
    department?: string;
}

export interface Course {
    id: string;
    code: string;
    name: string;
    description: string;
    credits: number;
    department: string;
    instructorId: string;
    instructorName: string;
    instructorEmail: string;
    maxSeats: number;
    enrolledCount: number;
    isOpen: boolean;
}

export interface Enrollment {
    id: string;
    studentId: string | { _id: string; name: string; email: string };
    courseId: string | { _id: string; code: string; name: string };
    status: 'pending_instructor' | 'pending_advisor' | 'approved' | 'rejected' | 'withdrawn';
    instructorApproval?: boolean;
    instructorRemarks?: string;
    advisorId?: string;
    advisorApproval?: boolean;
    advisorRemarks?: string;
    createdAt: string;
    updatedAt: string;
}
