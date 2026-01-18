// Seed script for initial data
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Course from './models/Course.js';
import Enrollment from './models/Enrollment.js';
import dns from 'dns';

// Use Google DNS for SRV record resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Course.deleteMany({});
        await Enrollment.deleteMany({});
        console.log('Cleared existing data');

        // ==========================================
        // INSTRUCTORS - Pre-registered (can approve enrollments)
        // ==========================================
        const instructors = await User.create([
            {
                email: 'bhantureddy65@gmail.com',  // Test instructor
                name: 'Dr. Bhantu Reddy',
                role: 'instructor',
                department: 'Computer Science'
            },
            {
                email: 'dr.sarah.smith@university.edu',
                name: 'Dr. Sarah Smith',
                role: 'instructor',
                department: 'Computer Science'
            },
            {
                email: 'dr.chen@university.edu',
                name: 'Dr. Emily Chen',
                role: 'instructor',
                department: 'Computer Science'
            },
            {
                email: 'prof.wilson@university.edu',
                name: 'Prof. David Wilson',
                role: 'instructor',
                department: 'Computer Science'
            }
        ]);
        console.log(`Created ${instructors.length} instructors`);

        // ==========================================
        // ADVISORS - Pre-registered (final approval)
        // ==========================================
        const advisors = await User.create([
            {
                email: 'hemanthsadineni@gmail.com',  // Test advisor (your email)
                name: 'Prof. Hemanth Sadineni',
                role: 'advisor',
                department: 'Computer Science'
            },
            {
                email: 'prof.johnson@university.edu',
                name: 'Prof. Michael Johnson',
                role: 'advisor',
                department: 'Computer Science'
            }
        ]);
        console.log(`Created ${advisors.length} advisors`);

        // ==========================================
        // ADMIN - System administrator
        // ==========================================
        const admin = await User.create({
            email: 'admin@university.edu',
            name: 'System Admin',
            role: 'admin',
            department: 'Administration'
        });
        console.log('Created admin user');

        // ==========================================
        // COURSES - With assigned instructors
        // ==========================================
        const courses = await Course.create([
            {
                code: 'CS301',
                name: 'Data Structures and Algorithms',
                description: 'Advanced study of data structures including trees, graphs, and hash tables.',
                credits: 4,
                department: 'Computer Science',
                instructorId: instructors[0]._id, // Dr. Bhantu Reddy
                maxSeats: 60,
                enrolledCount: 45,
                isOpen: true
            },
            {
                code: 'CS401',
                name: 'Machine Learning',
                description: 'Introduction to machine learning concepts, supervised and unsupervised learning.',
                credits: 4,
                department: 'Computer Science',
                instructorId: instructors[1]._id, // Dr. Sarah Smith
                maxSeats: 40,
                enrolledCount: 32,
                isOpen: true
            },
            {
                code: 'CS302',
                name: 'Database Management Systems',
                description: 'Relational database design, SQL, normalization, and NoSQL databases.',
                credits: 3,
                department: 'Computer Science',
                instructorId: instructors[2]._id, // Dr. Emily Chen
                maxSeats: 50,
                enrolledCount: 38,
                isOpen: true
            },
            {
                code: 'CS405',
                name: 'Computer Networks',
                description: 'TCP/IP, routing algorithms, and network security fundamentals.',
                credits: 3,
                department: 'Computer Science',
                instructorId: instructors[3]._id, // Prof. David Wilson
                maxSeats: 50,
                enrolledCount: 42,
                isOpen: true
            },
            {
                code: 'CS501',
                name: 'Cloud Computing',
                description: 'Cloud architecture, virtualization, containers, and microservices.',
                credits: 4,
                department: 'Computer Science',
                instructorId: instructors[0]._id, // Dr. Bhantu Reddy (teaches 2 courses)
                maxSeats: 45,
                enrolledCount: 20,
                isOpen: true
            }
        ]);
        console.log(`Created ${courses.length} courses`);

        // ==========================================
        // SUMMARY
        // ==========================================
        console.log('\n========================================');
        console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
        console.log('========================================\n');

        console.log('📧 PRE-REGISTERED USERS:\n');

        console.log('🔴 INSTRUCTORS (can approve enrollments):');
        instructors.forEach(i => console.log(`   - ${i.email} (${i.name})`));

        console.log('\n🟡 ADVISORS (final approval):');
        advisors.forEach(a => console.log(`   - ${a.email} (${a.name})`));

        console.log('\n🟢 ADMIN:');
        console.log(`   - ${admin.email}`);

        console.log('\n📚 COURSES:');
        for (const course of courses) {
            const instructor = instructors.find(i => i._id.equals(course.instructorId));
            console.log(`   - ${course.code}: ${course.name}`);
            console.log(`     Instructor: ${instructor?.name}`);
        }

        console.log('\n========================================');
        console.log('HOW ROLES WORK:');
        console.log('========================================');
        console.log('• New users logging in → Registered as STUDENT automatically');
        console.log('• Pre-registered emails → Use their assigned role');
        console.log('• Instructors → See and approve enrollment requests');
        console.log('• Advisors → Final approval for enrollments');
        console.log('========================================\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedData();
