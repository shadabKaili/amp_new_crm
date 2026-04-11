// Core type definitions for AMP CRM

export type UserRole = 'super_admin' | 'manager' | 'team_member' | 'member';

export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    role: UserRole;
    memberId?: string;
    ampId?: string; // For members
    mustChangePassword?: boolean;
    createdAt: Date;
}

export interface Member {
    id: string;
    ampId: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive' | 'pending';
    type: 'member' | 'volunteer';
    score: number;
    joinedAt: Date;
    address?: string;
    city?: string;
    state?: string;
    profileImage?: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    type: 'job_fair' | 'training' | 'workshop' | 'community' | 'industry_connect' | 'talent_exam' | 'other';
    status: 'planning' | 'active' | 'completed' | 'on_hold';
    startDate: Date;
    endDate?: Date;
    membersCount: number;
    volunteersCount: number;
    tasksCount: number;
}

export interface ProjectEvent {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    eventType: 'webinar' | 'meeting' | 'event' | 'workshop';
    eventDate: Date;
    scoreValue: number;
    status: 'upcoming' | 'completed' | 'cancelled';
    submissionsCount?: number;
}

export interface ProjectParticipationRequest {
    id: string;
    projectId: string;
    memberId: string;
    memberName: string;
    memberEmail?: string;
    note?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}

export interface ProjectActivitySubmission {
    id: string;
    projectId: string;
    projectEventId: string;
    memberId: string;
    memberName: string;
    eventTitle: string;
    eventType: 'webinar' | 'meeting' | 'event' | 'workshop';
    activityType: 'joined_webinar' | 'attended_meeting' | 'attended_event' | 'participated_in_workshop';
    notes?: string;
    scoreAwarded: number;
    status: 'submitted' | 'approved' | 'rejected';
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
}

export interface ProjectMemberState {
    isParticipant: boolean;
    requestStatus?: 'pending' | 'approved' | 'rejected';
    requestId?: string;
    latestSubmissionAt?: Date;
    latestSubmissionScore?: number;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'delayed';
    priority: 'low' | 'medium' | 'high';
    dueDate?: Date;
    assignedTo?: string; // User ID
    assignedToName?: string;

    // Task can be linked to multiple entities
    relatedMemberId?: string;
    relatedMemberName?: string;
    relatedProjectId?: string;
    relatedProjectName?: string;
    relatedVolunteerAppId?: string;

    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

export interface Activity {
    id: string;
    memberId: string;
    memberName: string;
    type: 'donation' | 'referral' | 'event_attendance' | 'volunteer' | 'other';
    title: string;
    description?: string;
    scoreEarned: number;
    date: Date;
    metadata?: Record<string, unknown>;
}

export interface Referral {
    id: string;
    referrerId: string;
    referrerName: string;
    referredName: string;
    referredEmail: string;
    referredPhone: string;
    status: 'pending' | 'contacted' | 'approved' | 'rejected';
    pointsEarned: number;
    joinedMemberId?: string;
    isConverted?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Donation {
    id: string;
    memberId: string;
    memberName: string;
    amount: number;
    date: Date;
    paymentMethod: 'cash' | 'online' | 'bank_transfer' | 'cheque' | 'upi';
    purpose?: string;
    receiptNumber?: string;
    notes?: string;
}

export interface VolunteerApplication {
    id: string;
    name: string;
    email: string;
    phone: string;
    referralAmpId?: string;
    assignedTeamUserId?: string;
    assignedTeamMemberName?: string;
    skills: string[];
    availability: string;
    motivation: string;
    status: 'pending' | 'applied' | 'reviewing' | 'approved' | 'rejected';
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    notes?: string;
}

export interface DashboardStats {
    totalMembers: number;
    activeVolunteers: number;
    pendingTasks: number;
    donationsThisMonth: number;
    memberGrowth: number; // percentage
}

export interface MemberDashboard {
    ampId: string;
    score: number;
    recentActivities: Activity[];
    referralsCount: number;
    donationsTotal: number;
}

export interface KPI {
    teamMember: string;
    tasksCompleted: number;
    membersOnboarded: number;
    avgResponseTime: number; // in hours
}

export interface OnboardingTeamMember {
    userId: string;
    teamMemberName: string;
    email?: string | null;
    isOnboardingTeam: boolean;
    lastAssignedAt?: string | null;
    assignedVolunteerApps: number;
}

export interface MemberOnboardingEvent {
    id: string;
    memberId: string;
    memberAmpId?: string;
    memberName: string;
    memberEmail?: string;
    teamMemberName: string;
    assignedTeamUserId?: string;
    eventType: 'member_onboarded';
    notes?: string;
    createdAt: Date;
}

export interface TaskCompletionEvent {
    id: string;
    taskId: string;
    taskTitle: string;
    taskStatus: 'pending' | 'in_progress' | 'completed' | 'delayed';
    taskPriority: 'low' | 'medium' | 'high';
    completedByUserId?: string;
    completedByName: string;
    assignedToUserId?: string;
    notes?: string;
    createdAt: Date;
}

export interface PaginationMeta {
    total: number;
    limit: number;
    offset: number;
}

export interface PaginatedResponse<T> extends PaginationMeta {
    data: T[];
}

export interface DateRange {
    from: string;
    to: string;
}
