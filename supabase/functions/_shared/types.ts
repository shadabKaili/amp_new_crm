export interface MemberPayload {
  memberId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  status?: string;
}

export interface TaskPayload {
  taskId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assignedTo?: string | null;
  relatedMemberId?: string | null;
  relatedProjectId?: string | null;
  relatedVolunteerAppId?: string | null;
  remarks?: string;
}

export interface ProjectPayload {
  projectId?: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface DonationPayload {
  memberId: string;
  amount: number;
  paymentMethod: string;
  receiptNumber?: string;
  purpose?: string;
  notes?: string;
}

export interface ReferralPayload {
  referralId?: string;
  referrerId: string;
  referredName: string;
  referredEmail?: string;
  referredPhone?: string;
  status?: string;
}

export interface VolunteerPayload {
  applicationId?: string;
  name: string;
  email?: string;
  phone?: string;
  referralAmpId?: string;
  skills?: string[];
  availability?: string;
  motivation?: string;
  status?: string;
  notes?: string;
  createFollowUpTask?: boolean;
  assignedTeamUserId?: string;
}

export interface PublicSignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatarUrl?: string;
}
