/**
 * Type mapping utilities for converting between Supabase database types
 * and frontend application types.
 */

import { Member, Project, Task, Activity, Donation, Referral, VolunteerApplication } from '@/lib/types';

// ============================================================
// MEMBER MAPPING
// ============================================================

export interface DbMember {
    id: string;
    amp_id: string;
    full_name: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    is_active: boolean;
    created_at: string;
}

export interface DbMemberStatus {
    status: string;
    assigned_team_user_id: string | null;
    last_contacted_at: string | null;
    last_activity_at: string | null;
}

export interface DbMemberScore {
    total_score: number;
    last_activity_at: string | null;
}

export function mapDbMemberToMember(
    dbMember: DbMember,
    status?: DbMemberStatus | null,
    score?: DbMemberScore | null
): Member {
    return {
        id: dbMember.id,
        ampId: dbMember.amp_id,
        name: dbMember.full_name,
        firstName: dbMember.first_name ?? undefined,
        lastName: dbMember.last_name ?? undefined,
        email: dbMember.email ?? '',
        phone: dbMember.phone ?? '',
        status: (status?.status as Member['status']) ?? 'pending',
        type: 'member', // Default - can be determined by checking user_members or volunteer_applications
        score: score?.total_score ?? 0,
        city: dbMember.city ?? undefined,
        state: dbMember.state ?? undefined,
        joinedAt: new Date(dbMember.created_at),
    };
}

// ============================================================
// PROJECT MAPPING
// ============================================================

export interface DbProject {
    id: number;
    name: string;
    type: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
}

export function mapDbProjectToProject(
    dbProject: DbProject,
    membersCount: number = 0,
    volunteersCount: number = 0,
    tasksCount: number = 0
): Project {
    return {
        id: dbProject.id.toString(),
        name: dbProject.name,
        description: '', // Not in current schema - may need to add
        type: (dbProject.type as Project['type']) ?? 'other',
        status: 'active', // Need to determine from dates or add status field
        startDate: dbProject.start_date ? new Date(dbProject.start_date) : new Date(),
        endDate: dbProject.end_date ? new Date(dbProject.end_date) : undefined,
        membersCount,
        volunteersCount,
        tasksCount,
    };
}

// ============================================================
// TASK MAPPING
// ============================================================

export interface DbTask {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    assigned_to: string | null;
    related_member_id: string | null;
    related_project_id: number | null;
    related_volunteer_app_id: number | null;
    remarks: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

export function mapDbTaskToTask(
    dbTask: DbTask,
    assignedToName?: string,
    relatedMemberName?: string,
    relatedProjectName?: string
): Task {
    return {
        id: dbTask.id.toString(),
        title: dbTask.title,
        description: dbTask.description ?? undefined,
        status: dbTask.status as Task['status'],
        priority: dbTask.priority as Task['priority'],
        dueDate: dbTask.due_date ? new Date(dbTask.due_date) : undefined,
        assignedTo: dbTask.assigned_to ?? undefined,
        assignedToName: assignedToName,
        relatedMemberId: dbTask.related_member_id ?? undefined,
        relatedMemberName: relatedMemberName,
        relatedProjectId: dbTask.related_project_id?.toString(),
        relatedProjectName: relatedProjectName,
        relatedVolunteerAppId: dbTask.related_volunteer_app_id?.toString(),
        remarks: dbTask.remarks ?? undefined,
        createdAt: new Date(dbTask.created_at),
        updatedAt: new Date(dbTask.updated_at),
        completedAt: dbTask.completed_at ? new Date(dbTask.completed_at) : undefined,
    };
}

// ============================================================
// ACTIVITY MAPPING
// ============================================================

export interface DbActivity {
    id: number;
    member_id: string;
    activity_type_id: number;
    score_earned: number;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface DbActivityType {
    id: number;
    code: string;
    description: string | null;
    score: number;
}

export function mapDbActivityToActivity(
    dbActivity: DbActivity,
    memberName: string,
    activityType: DbActivityType
): Activity {
    return {
        id: dbActivity.id.toString(),
        memberId: dbActivity.member_id,
        memberName,
        type: activityType.code as Activity['type'],
        title: activityType.description ?? activityType.code,
        description: typeof dbActivity.metadata?.description === 'string' ? dbActivity.metadata.description : undefined,
        scoreEarned: dbActivity.score_earned,
        date: new Date(dbActivity.created_at),
        metadata: dbActivity.metadata ?? undefined,
    };
}

// ============================================================
// DONATION MAPPING
// ============================================================

export interface DbDonation {
    id: number;
    member_id: string;
    amount: string; // numeric in DB
    payment_mode: string | null;
    reference_no: string | null;
    created_at: string;
}

export function mapDbDonationToDonation(
    dbDonation: DbDonation,
    memberName: string
): Donation {
    return {
        id: dbDonation.id.toString(),
        memberId: dbDonation.member_id,
        memberName,
        amount: parseFloat(dbDonation.amount),
        date: new Date(dbDonation.created_at),
        paymentMethod: (dbDonation.payment_mode as Donation['paymentMethod']) ?? 'cash',
        purpose: undefined, // Not in current schema
        receiptNumber: dbDonation.reference_no ?? undefined,
        notes: undefined,
    };
}

// ============================================================
// REFERRAL MAPPING
// ============================================================

export interface DbReferral {
    id: number;
    referrer_member_id: string;
    referred_name: string;
    referred_phone: string | null;
    referred_email: string | null;
    status: string;
    joined_member_id: string | null;
    created_at: string;
}

export function mapDbReferralToReferral(
    dbReferral: DbReferral,
    referrerName: string
): Referral {
    return {
        id: dbReferral.id.toString(),
        referrerId: dbReferral.referrer_member_id,
        referrerName,
        referredName: dbReferral.referred_name,
        referredEmail: dbReferral.referred_email ?? '',
        referredPhone: dbReferral.referred_phone ?? '',
        status: dbReferral.status as Referral['status'],
        pointsEarned: dbReferral.status === 'approved' ? 150 : 0, // Based on activity_types
        joinedMemberId: dbReferral.joined_member_id ?? undefined,
        isConverted: Boolean(dbReferral.joined_member_id),
        createdAt: new Date(dbReferral.created_at),
        updatedAt: new Date(dbReferral.created_at), // Schema doesn't have updated_at
    };
}

// ============================================================
// VOLUNTEER APPLICATION MAPPING
// ============================================================

export interface DbVolunteerApplication {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    skills: string | null;
    availability: string | null;
    referred_by_amp_id: string | null;
    referrer_member_id: string | null;
    status: string;
    created_at: string;
}

export function mapDbVolunteerAppToVolunteerApp(
    dbApp: DbVolunteerApplication
): VolunteerApplication {
    return {
        id: dbApp.id.toString(),
        name: dbApp.full_name,
        email: dbApp.email ?? '',
        phone: dbApp.phone ?? '',
        referralAmpId: dbApp.referred_by_amp_id ?? undefined,
        skills: dbApp.skills ? dbApp.skills.split(',').map(s => s.trim()) : [],
        availability: dbApp.availability ?? '',
        motivation: '', // Not in current schema
        status: dbApp.status as VolunteerApplication['status'],
        submittedAt: new Date(dbApp.created_at),
        reviewedAt: undefined,
        reviewedBy: undefined,
        notes: undefined,
    };
}
