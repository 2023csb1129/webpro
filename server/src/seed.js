// Seed script for initial data
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Course from './models/Course.js';
import Enrollment from './models/Enrollment.js';
import InstructorCourse from './models/InstructorCourse.js';
import dns from 'dns';

// Use Google DNS for SRV record resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const generateUserList = (baseList, role, department, baseEmail) => {
    return baseList.map((name, index) => {
        const [userPart, domainPart] = baseEmail.split('@');
        return {
            email: index === 0 ? baseEmail : `${userPart}+${index}@${domainPart}`,
            name: name,
            role: role,
            department: Array.isArray(department) ? department[index % department.length] : department
        };
    });
};

const seedData = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aims';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Course.deleteMany({});
        await Enrollment.deleteMany({});
        await InstructorCourse.deleteMany({});
        console.log('Cleared existing data');

        // ==========================================
        // ADMIN
        // ==========================================
        const mainAdmin = await User.create({
            email: 'skp10022006@gmail.com',
            name: 'Main Admin',
            role: 'admin',
            department: 'Administration'
        });
        console.log('Created admin user');

        // ==========================================
        // INSTRUCTORS
        // ==========================================
        const instructorNames = [
            'Dr. Arpit Sharma', 'Dr. Sumit Kumar', 'Prof. Meena Rao',
            'Dr. Rajesh Gupta', 'Prof. Anjali Singh', 'Dr. Vikram Malhotra',
            'Dr. Sneha Patil', 'Prof. Alok Deshmukh', 'Dr. Kavita Reddy',
            'Prof. Rohan Verma', 'Dr. Nikita Jain'
        ];
        const instructors = await User.create(generateUserList(instructorNames, 'instructor', 'Computer Science', 'vennelanayak87@gmail.com'));
        console.log(`Created ${instructors.length} instructors`);

        // ==========================================
        // ADVISORS
        // ==========================================
        const advisorNames = [
            'Prof. K. Venkatesh', 'Dr. S. R. Murthy', 'Prof. Preeti Mittal',
            'Dr. G. S. Rao', 'Prof. Lakshmi Narayan', 'Dr. T. R. Krishnan',
            'Prof. B. D. Gupta', 'Dr. P. S. Reddy', 'Prof. M. S. Swamy',
            'Dr. R. K. Sharma', 'Prof. V. K. Singh'
        ];
        const branches = ['CSE', 'MNC', 'AI'];
        const advisors = await User.create(generateUserList(advisorNames, 'advisor', branches, 'vennelarathod2@gmail.com'));
        console.log(`Created ${advisors.length} advisors across branches`);

        // ==========================================
        // STUDENTS
        // ==========================================
        const cseNames = [
            'Aaryan Singh', 'Ishita Sharma', 'Rohan Gupta', 'Sanya Malhotra',
            'Aditya Verma', 'Ananya Kapoor', 'Kabir Das', 'Meera Iyer',
            'Vihaan Reddy', 'Zoya Khan', 'Arjun Saxena'
        ];
        const aiNames = [
            'Rahul Dravid', 'Priya Mani', 'Siddharth Roy', 'Tara Sutaria',
            'Varun Dhawan', 'Kriti Sanon', 'Ayushmann Khurrana', 'Alia Bhatt',
            'Ranbir Kapoor', 'Deepika Padukone', 'Shah Rukh Khan'
        ];

        const studentsCSE = await User.create(generateUserList(cseNames, 'student', 'CSE', '2023csb1129@iitrpr.ac.in'));
        const studentsAI = await User.create(generateUserList(aiNames, 'student', 'AI', '2023csb1110@iitrpr.ac.in'));

        console.log(`Created ${studentsCSE.length} CSE students and ${studentsAI.length} AI students`);

        // ==========================================
        // COURSES
        // ==========================================
        const courseData = [
            { code: 'HS301', name: 'Industrial management', credits: 3, eligible: ['CSE', 'MNC', 'AI'] },
            { code: 'CS304', name: 'Computer networks', credits: 4, eligible: ['CSE'] },
            { code: 'CS305', name: 'Software Engineering', credits: 4, eligible: ['CSE', 'AI'] },
            { code: 'CS306', name: 'Theory of computation', credits: 4, eligible: ['CSE', 'MNC'] },
            { code: 'CP301', name: 'Development engineering project', credits: 6, eligible: ['CSE', 'MNC', 'AI'] },
            { code: 'HS104', name: 'Professional ethics', credits: 2, eligible: ['CSE', 'MNC', 'AI'] },
            { code: 'HS202', name: 'Human geography', credits: 3, eligible: ['CSE', 'MNC', 'AI'] },
            { code: 'CS303', name: 'Operating systems', credits: 4, eligible: ['CSE'] },
            { code: 'CS302', name: 'Analysis and design of algorithms', credits: 4, eligible: ['CSE', 'MNC', 'AI'] },
            { code: 'CS301', name: 'Databases', credits: 4, eligible: ['CSE', 'AI'] },
            { code: 'GE109', name: 'Introduction to engineering products', credits: 2, eligible: ['CSE', 'MNC', 'AI'] },
            { code: 'MA202', name: 'Probability and statistics', credits: 4, eligible: ['MNC', 'AI'] },
            { code: 'CS204', name: 'Computer architecture', credits: 4, eligible: ['CSE'] }
        ];

        const courses = await Course.create(courseData.map((c, index) => ({
            code: c.code,
            name: c.name,
            credits: c.credits,
            eligibleBranches: c.eligible,
            description: `Core course on ${c.name}`,
            department: 'Computer Science', // Keep internal dept name if needed, or sync with branches
            instructorId: instructors[index % instructors.length]._id,
            maxSeats: 60,
            isOpen: true
        })));
        console.log(`Created ${courses.length} courses with branch eligibility`);

        // ==========================================
        // INITIAL INSTRUCTOR-COURSE ASSIGNMENTS
        // ==========================================
        // Ensure instructors also have records in InstructorCourse so they see them in "My Courses"
        await InstructorCourse.create(courses.map(course => ({
            instructorId: course.instructorId,
            courseId: course._id,
            semester: 'Spring 2026',
            isActive: true
        })));
        console.log('Created initial instructor-course assignments');

        console.log('\n========================================');
        console.log('✅ DATABASE RESET AND SEEDED SUCCESSFULLY!');
        console.log('========================================\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedData();
