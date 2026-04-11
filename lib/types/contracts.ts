import type {
    Activity,
    DashboardStats,
    Donation,
    KPI,
    Member,
    Project,
    Referral,
    Task,
    VolunteerApplication,
} from '@/lib/types';

export interface RpcListParams {
    limit?: number;
    offset?: number;
}

export interface MembersListParams extends RpcListParams {
    search?: string;
    status?: string;
}

export interface TasksListParams extends RpcListParams {
    status?: string;
    assignedTo?: string;
    priority?: string;
    relatedMemberId?: string;
    relatedProjectId?: string;
    relatedVolunteerAppId?: string;
}

export interface ProjectsListParams extends RpcListParams {
    status?: string;
    type?: string;
}

export interface DateRangeParams extends RpcListParams {
    from: string;
    to: string;
}

export interface DonationsListParams extends DateRangeParams {
    memberId?: string;
}

export interface ReferralsListParams extends RpcListParams {
    status?: string;
    referrerId?: string;
}

export interface VolunteerApplicationsListParams extends RpcListParams {
    status?: string;
    assignedTeamUserId?: string;
}

export interface ActivitiesListParams extends DateRangeParams {
    memberId?: string;
    type?: string;
}

export interface MemberWriteInput {
    memberId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    status?: Member['status'];
}

export interface TaskWriteInput {
    taskId?: string;
    title: string;
    description?: string;
    status?: Task['status'];
    priority?: Task['priority'];
    dueDate?: string | null;
    assignedTo?: string | null;
    relatedMemberId?: string | null;
    relatedProjectId?: string | null;
    relatedVolunteerAppId?: string | null;
    remarks?: string;
}

export interface ProjectWriteInput {
    projectId?: string;
    name: string;
    description?: string;
    type?: Project['type'];
    status?: Project['status'];
    startDate?: string | null;
    endDate?: string | null;
}

export interface ProjectEventWriteInput {
    eventId?: string;
    projectId: string;
    title: string;
    description?: string;
    eventType: 'webinar' | 'meeting' | 'event' | 'workshop';
    eventDate: string;
    scoreValue?: number;
    status?: 'upcoming' | 'completed' | 'cancelled';
}

export interface ProjectParticipationRequestInput {
    requestId?: string;
    projectId: string;
    memberId: string;
    note?: string;
    status?: 'pending' | 'approved' | 'rejected';
}

export interface ProjectActivitySubmissionInput {
    submissionId?: string;
    projectId: string;
    projectEventId: string;
    memberId: string;
    notes?: string;
    activityType?: 'joined_webinar' | 'attended_meeting' | 'attended_event' | 'participated_in_workshop';
    scoreAwarded?: number;
}

export interface DonationWriteInput {
    memberId: string;
    amount: number;
    paymentMethod: Donation['paymentMethod'];
    receiptNumber?: string;
    purpose?: string;
    notes?: string;
}

export interface ReferralWriteInput {
    referralId?: string;
    referrerId: string;
    referredName: string;
    referredEmail?: string;
    referredPhone?: string;
    status?: Referral['status'];
}

export interface VolunteerApplicationWriteInput {
    applicationId?: string;
    name: string;
    email?: string;
    phone?: string;
    referralAmpId?: string;
    assignedTeamUserId?: string | null;
    skills: string[];
    availability?: string;
    motivation?: string;
    status?: VolunteerApplication['status'];
    notes?: string;
    createFollowUpTask?: boolean;
}

export interface DashboardPayload {
    stats: DashboardStats;
    recentActivity: Activity[];
    pendingTasks: Task[];
}

export interface MemberDetailPayload {
    member: Member;
    activities: Activity[];
    donations: Donation[];
    referrals: Referral[];
    tasks: Task[];
}

export interface ProjectDetailPayload {
    project: Project;
    tasks: Task[];
}

export interface KpiPayload {
    data: KPI[];
    total: number;
    limit: number;
    offset: number;
}
