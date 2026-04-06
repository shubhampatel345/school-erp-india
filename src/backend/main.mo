import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";



actor {
  type NotificationChannel = {
    email : Bool;
    sms : Bool;
    push : Bool;
    rcs : Bool;
    whatsapp : Bool;
    inApp : Bool;
  };

  type NotificationRecipientGroup = {
    teachers : Bool;
    students : Bool;
    parents : Bool;
    staff : Bool;
    admins : Bool;
  };

  let credentialRecords = Map.empty<Text, CredentialRecord>();
  let paymentRecords = Map.empty<Nat, PaymentRecord>();
  let notificationRuleRecords = Map.empty<Nat, NotificationRuleRecord>();
  let attendanceScanRecords = Map.empty<Nat, AttendanceScanRecord>();
  let rcsMessageRecords = Map.empty<Nat, RCSMessageRecord>();

  var nextPaymentId = 1;
  var nextNotificationRuleId = 1;
  var nextAttendanceScanId = 1;
  var nextRCSMessageId = 1;

  public shared ({ caller }) func createCredentialRecord(userId : Text, hashedPassword : Text) : async () {
    let credentialRecord = {
      userId;
      hashedPassword;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    credentialRecords.add(userId, credentialRecord);
  };

  public shared ({ caller }) func resetPassword(userId : Text, newHashedPassword : Text) : async () {
    switch (credentialRecords.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?credentialRecord) {
        let updatedRecord = {
          credentialRecord with
          hashedPassword = newHashedPassword;
          updatedAt = Time.now();
        };
        credentialRecords.add(userId, updatedRecord);
      };
    };
  };

  public query ({ caller }) func getCredentialRecord(userId : Text) : async ?CredentialRecord {
    credentialRecords.get(userId);
  };

  public shared ({ caller }) func createPaymentRecord(studentId : Text, amount : Nat, monthsPaid : [Text], paymentGateway : Text, receiptNumber : Text) : async Nat {
    let paymentRecord = {
      id = nextPaymentId;
      studentId;
      amount;
      monthsPaid;
      paymentGateway;
      timestamp = Time.now();
      receiptNumber;
    };

    paymentRecords.add(nextPaymentId, paymentRecord);
    let currentId = nextPaymentId;
    nextPaymentId += 1;
    currentId;
  };

  public query ({ caller }) func getPaymentRecord(id : Nat) : async ?PaymentRecord {
    paymentRecords.get(id);
  };

  public query ({ caller }) func getCredentialRecords() : async [CredentialRecord] {
    credentialRecords.values().toArray();
  };

  public shared ({ caller }) func createNotificationRuleRecord(
    eventType : Text,
    timing : Text,
    channels : NotificationChannel,
    recipientGroups : NotificationRecipientGroup,
    isActive : Bool,
  ) : async Nat {
    let notificationRuleRecord = {
      id = nextNotificationRuleId;
      eventType;
      timing;
      channels;
      recipientGroups;
      isActive;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    notificationRuleRecords.add(nextNotificationRuleId, notificationRuleRecord);
    let currentId = nextNotificationRuleId;
    nextNotificationRuleId += 1;
    currentId;
  };

  public shared ({ caller }) func updateNotificationRuleRecord(id : Nat, eventType : Text, timing : Text, channels : NotificationChannel, recipientGroups : NotificationRecipientGroup, isActive : Bool) : async () {
    switch (notificationRuleRecords.get(id)) {
      case (null) { Runtime.trap("Notification rule not found") };
      case (?notificationRuleRecord) {
        let updatedRecord = {
          id = id;
          eventType;
          timing;
          channels;
          recipientGroups;
          isActive;
          createdAt = notificationRuleRecord.createdAt;
          updatedAt = Time.now();
        };
        notificationRuleRecords.add(id, updatedRecord);
      };
    };
  };

  public query ({ caller }) func getNotificationRuleRecord(id : Nat) : async ?NotificationRuleRecord {
    notificationRuleRecords.get(id);
  };

  public query ({ caller }) func getNotificationRuleRecords() : async [NotificationRuleRecord] {
    notificationRuleRecords.values().toArray();
  };

  public shared ({ caller }) func logAttendanceScan(studentId : Text, scannedBy : Text, deviceRole : Text) : async Nat {
    let attendanceScanRecord = {
      id = nextAttendanceScanId;
      studentId;
      timestamp = Time.now();
      scannedBy;
      deviceRole;
    };

    attendanceScanRecords.add(nextAttendanceScanId, attendanceScanRecord);
    let currentId = nextAttendanceScanId;
    nextAttendanceScanId += 1;
    currentId;
  };

  public query ({ caller }) func getAttendanceScanRecord(id : Nat) : async ?AttendanceScanRecord {
    attendanceScanRecords.get(id);
  };

  public query ({ caller }) func getAttendanceScanRecords() : async [AttendanceScanRecord] {
    attendanceScanRecords.values().toArray();
  };

  public shared ({ caller }) func logRCSMessage(recipient : Text, message : Text, status : Text) : async Nat {
    let rcsMessageRecord = {
      id = nextRCSMessageId;
      recipient;
      message;
      timestamp = Time.now();
      status;
    };

    rcsMessageRecords.add(nextRCSMessageId, rcsMessageRecord);
    let currentId = nextRCSMessageId;
    nextRCSMessageId += 1;
    currentId;
  };

  public query ({ caller }) func getRCSMessageRecord(id : Nat) : async ?RCSMessageRecord {
    rcsMessageRecords.get(id);
  };

  public query ({ caller }) func getRCSMessageRecords() : async [RCSMessageRecord] {
    rcsMessageRecords.values().toArray();
  };

  public query ({ caller }) func getPaymentRecords() : async [PaymentRecord] {
    paymentRecords.values().toArray();
  };

  type CredentialRecord = {
    userId : Text;
    hashedPassword : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type PaymentRecord = {
    id : Nat;
    studentId : Text;
    amount : Nat;
    monthsPaid : [Text];
    paymentGateway : Text;
    timestamp : Time.Time;
    receiptNumber : Text;
  };

  type NotificationRuleRecord = {
    id : Nat;
    eventType : Text;
    timing : Text;
    channels : NotificationChannel;
    recipientGroups : NotificationRecipientGroup;
    isActive : Bool;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type AttendanceScanRecord = {
    id : Nat;
    studentId : Text;
    timestamp : Time.Time;
    scannedBy : Text;
    deviceRole : Text;
  };

  type RCSMessageRecord = {
    id : Nat;
    recipient : Text;
    message : Text;
    timestamp : Time.Time;
    status : Text;
  };
};
