import {
    Member,
    Project,
    Task,
    Activity,
    Referral,
    Donation,
    VolunteerApplication,
    DashboardStats,
    MemberDashboard,
    KPI
} from '@/lib/types';

// Mock Members Data
export const mockMembers: Member[] = [
    {
        id: '1',
        ampId: 'AMP2024001',
        name: 'Ahmed Hassan',
        email: 'ahmed@example.com',
        phone: '+971501234567',
        status: 'active',
        type: 'member',
        score: 850,
        joinedAt: new Date('2024-01-15'),
        city: 'Dubai',
        state: 'Dubai',
    },
    {
        id: '2',
        ampId: 'AMP2024002',
        name: 'Fatima Ali',
        email: 'fatima@example.com',
        phone: '+971507654321',
        status: 'active',
        type: 'volunteer',
        score: 1200,
        joinedAt: new Date('2023-11-20'),
        city: 'Abu Dhabi',
        state: 'Abu Dhabi',
    },
    {
        id: '3',
        ampId: 'AMP2024003',
        name: 'Omar Khan',
        email: 'omar@example.com',
        phone: '+971509876543',
        status: 'pending',
        type: 'member',
        score: 0,
        joinedAt: new Date('2024-12-10'),
        city: 'Sharjah',
        state: 'Sharjah',
    },
];

// Mock Projects Data
export const mockProjects: Project[] = [
    {
        id: '1',
        name: 'Youth Employment Program 2024',
        description: 'Job fair and career counseling for fresh graduates',
        type: 'job_fair',
        status: 'active',
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-12-31'),
        membersCount: 45,
        volunteersCount: 12,
        tasksCount: 8,
    },
    {
        id: '2',
        name: 'Digital Skills Training',
        description: 'IT training workshops for community members',
        type: 'training',
        status: 'planning',
        startDate: new Date('2025-01-15'),
        membersCount: 0,
        volunteersCount: 5,
        tasksCount: 15,
    },
];

// Mock Tasks Data
export const mockTasks: Task[] = [
    {
        id: '1',
        title: 'Call volunteer Ahmed for job fair',
        description: 'Confirm availability for the upcoming event',
        status: 'pending',
        priority: 'high',
        dueDate: new Date('2024-12-22'),
        assignedTo: 'user1',
        assignedToName: 'Sarah Admin',
        relatedMemberId: '1',
        relatedMemberName: 'Ahmed Hassan',
        relatedProjectId: '1',
        relatedProjectName: 'Youth Employment Program 2024',
        createdAt: new Date('2024-12-20'),
        updatedAt: new Date('2024-12-20'),
    },
    {
        id: '2',
        title: 'Verify training details',
        description: 'Check venue and equipment availability',
        status: 'in_progress',
        priority: 'medium',
        dueDate: new Date('2024-12-25'),
        assignedTo: 'user2',
        assignedToName: 'John Manager',
        relatedProjectId: '2',
        relatedProjectName: 'Digital Skills Training',
        createdAt: new Date('2024-12-18'),
        updatedAt: new Date('2024-12-21'),
    },
    {
        id: '3',
        title: 'Follow up with volunteer application',
        description: 'Review new volunteer submission',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date('2024-12-23'),
        assignedTo: 'user1',
        assignedToName: 'Sarah Admin',
        relatedVolunteerAppId: '1',
        relatedMemberName: 'New Applicant',
        createdAt: new Date('2024-12-21'),
        updatedAt: new Date('2024-12-21'),
    },
];

// Mock Activities Data
export const mockActivities: Activity[] = [
    {
        id: '1',
        memberId: '1',
        memberName: 'Ahmed Hassan',
        type: 'donation',
        title: 'Monthly donation',
        scoreEarned: 100,
        date: new Date('2024-12-15'),
    },
    {
        id: '2',
        memberId: '2',
        memberName: 'Fatima Ali',
        type: 'volunteer',
        title: 'Volunteered at job fair',
        scoreEarned: 200,
        date: new Date('2024-12-10'),
    },
];

// Mock Referrals Data
export const mockReferrals: Referral[] = [
    {
        id: '1',
        referrerId: '1',
        referrerName: 'Ahmed Hassan',
        referredName: 'Zainab Mohammed',
        referredEmail: 'zainab@example.com',
        referredPhone: '+971501111111',
        status: 'approved',
        pointsEarned: 150,
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-05'),
    },
];

// Mock Donations Data
export const mockDonations: Donation[] = [
    {
        id: '1',
        memberId: '1',
        memberName: 'Ahmed Hassan',
        amount: 500,
        date: new Date('2024-12-15'),
        paymentMethod: 'online',
        purpose: 'General fund',
        receiptNumber: 'RCT-2024-001',
    },
    {
        id: '2',
        memberId: '2',
        memberName: 'Fatima Ali',
        amount: 1000,
        date: new Date('2024-11-20'),
        paymentMethod: 'bank_transfer',
        purpose: 'Education scholarship',
        receiptNumber: 'RCT-2024-002',
    },
];

// Mock Volunteer Applications
export const mockVolunteerApplications: VolunteerApplication[] = [
    {
        id: '1',
        name: 'Hassan Ibrahim',
        email: 'hassan@example.com',
        phone: '+971502222222',
        referralAmpId: 'AMP2024001',
        skills: ['Event Management', 'Communication'],
        availability: 'Weekends',
        motivation: 'Want to give back to the community',
        status: 'pending',
        submittedAt: new Date('2024-12-20'),
    },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
    totalMembers: 156,
    activeVolunteers: 42,
    pendingTasks: 23,
    donationsThisMonth: 45600,
    memberGrowth: 12.5,
};

// Mock Member Dashboard
export const mockMemberDashboard: MemberDashboard = {
    ampId: 'AMP2024001',
    score: 850,
    recentActivities: mockActivities.slice(0, 3),
    referralsCount: 3,
    donationsTotal: 2500,
};

// Mock KPIs
export const mockKPIs: KPI[] = [
    {
        teamMember: 'Sarah Admin',
        tasksCompleted: 34,
        membersOnboarded: 12,
        avgResponseTime: 2.5,
    },
    {
        teamMember: 'John Manager',
        tasksCompleted: 28,
        membersOnboarded: 8,
        avgResponseTime: 3.2,
    },
];
