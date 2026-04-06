import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface NotificationRuleRecord {
    id: bigint;
    timing: string;
    createdAt: Time;
    recipientGroups: NotificationRecipientGroup;
    channels: NotificationChannel;
    isActive: boolean;
    updatedAt: Time;
    eventType: string;
}
export interface AttendanceScanRecord {
    id: bigint;
    studentId: string;
    scannedBy: string;
    timestamp: Time;
    deviceRole: string;
}
export interface PaymentRecord {
    id: bigint;
    studentId: string;
    paymentGateway: string;
    timestamp: Time;
    monthsPaid: Array<string>;
    amount: bigint;
    receiptNumber: string;
}
export interface RCSMessageRecord {
    id: bigint;
    status: string;
    recipient: string;
    message: string;
    timestamp: Time;
}
export interface CredentialRecord {
    userId: string;
    createdAt: Time;
    updatedAt: Time;
    hashedPassword: string;
}
export interface NotificationRecipientGroup {
    students: boolean;
    teachers: boolean;
    staff: boolean;
    admins: boolean;
    parents: boolean;
}
export interface NotificationChannel {
    rcs: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
    email: boolean;
    inApp: boolean;
}
export interface backendInterface {
    createCredentialRecord(userId: string, hashedPassword: string): Promise<void>;
    createNotificationRuleRecord(eventType: string, timing: string, channels: NotificationChannel, recipientGroups: NotificationRecipientGroup, isActive: boolean): Promise<bigint>;
    createPaymentRecord(studentId: string, amount: bigint, monthsPaid: Array<string>, paymentGateway: string, receiptNumber: string): Promise<bigint>;
    getAttendanceScanRecord(id: bigint): Promise<AttendanceScanRecord | null>;
    getAttendanceScanRecords(): Promise<Array<AttendanceScanRecord>>;
    getCredentialRecord(userId: string): Promise<CredentialRecord | null>;
    getCredentialRecords(): Promise<Array<CredentialRecord>>;
    getNotificationRuleRecord(id: bigint): Promise<NotificationRuleRecord | null>;
    getNotificationRuleRecords(): Promise<Array<NotificationRuleRecord>>;
    getPaymentRecord(id: bigint): Promise<PaymentRecord | null>;
    getPaymentRecords(): Promise<Array<PaymentRecord>>;
    getRCSMessageRecord(id: bigint): Promise<RCSMessageRecord | null>;
    getRCSMessageRecords(): Promise<Array<RCSMessageRecord>>;
    logAttendanceScan(studentId: string, scannedBy: string, deviceRole: string): Promise<bigint>;
    logRCSMessage(recipient: string, message: string, status: string): Promise<bigint>;
    resetPassword(userId: string, newHashedPassword: string): Promise<void>;
    updateNotificationRuleRecord(id: bigint, eventType: string, timing: string, channels: NotificationChannel, recipientGroups: NotificationRecipientGroup, isActive: boolean): Promise<void>;
}
