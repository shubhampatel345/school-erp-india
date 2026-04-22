import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";

module {
  // ── Old actor state (copied from previous version) ────────────────────────
  type OldActor = {
    students     : List.List<Text>;
    staff        : List.List<Text>;
    sessions     : List.List<Text>;
    classes      : List.List<Text>;
    sections     : List.List<Text>;
    subjects     : List.List<Text>;
    attendance   : List.List<Text>;
    feeReceipts  : List.List<Text>;
    feesPlan     : List.List<Text>;
    feeHeads     : List.List<Text>;
    feeBalances  : List.List<Text>;
    transport    : List.List<Text>;
    pickupPoints : List.List<Text>;
    inventory    : List.List<Text>;
    expenses     : List.List<Text>;
    expenseHeads : List.List<Text>;
    homework     : List.List<Text>;
    alumni       : List.List<Text>;
    payroll      : List.List<Text>;
    payslips     : List.List<Text>;
    notices      : List.List<Text>;
    examinations : List.List<Text>;
    examResults  : List.List<Text>;
    library      : List.List<Text>;
    changelog    : List.List<Text>;
  };

  // ── New actor state ───────────────────────────────────────────────────────
  type NewActor = {
    store     : Map.Map<Text, Map.Map<Text, Text>>;
    changelog : List.List<Text>;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// Extract the value of "id":"..." or "id":123 from a JSON string.
  private func extractId(json : Text) : Text {
    let needle = "\"id\":\"";
    switch (json.stripStart(#text needle)) {
      case (?rest) {
        var id = "";
        var done = false;
        for (ch in rest.toIter()) {
          if (not done) {
            if (ch == '\"') { done := true }
            else { id #= Text.fromChar(ch) };
          };
        };
        id
      };
      case null {
        let needle2 = "\"id\":";
        switch (json.stripStart(#text needle2)) {
          case null "";
          case (?rest) {
            var id = "";
            var done = false;
            for (ch in rest.toIter()) {
              if (not done) {
                if (ch >= '0' and ch <= '9') { id #= Text.fromChar(ch) }
                else { done := true };
              };
            };
            id
          };
        }
      };
    }
  };

  /// Ingest a List<Text> of JSON records into the given inner map.
  /// Records with an empty id get an auto-generated key (index-based).
  private func ingestList(
    coll : Map.Map<Text, Text>,
    list : List.List<Text>,
    prefix : Text
  ) {
    var idx : Nat = 0;
    list.forEach(func(json : Text) {
      let id = extractId(json);
      let key = if (id == "") { prefix # "_" # idx.toText() } else { id };
      if (not coll.containsKey(key)) {
        coll.add(key, json);
      };
      idx += 1;
    });
  };

  /// Get or create a named inner map inside the outer store.
  private func col(
    store : Map.Map<Text, Map.Map<Text, Text>>,
    name  : Text
  ) : Map.Map<Text, Text> {
    switch (store.get(name)) {
      case (?m) m;
      case null {
        let m = Map.empty<Text, Text>();
        store.add(name, m);
        m;
      };
    }
  };

  // ── Migration entry point ─────────────────────────────────────────────────
  public func run(old : OldActor) : NewActor {
    let store = Map.empty<Text, Map.Map<Text, Text>>();

    ingestList(col(store, "students"),        old.students,     "std");
    ingestList(col(store, "staff"),           old.staff,        "stf");
    ingestList(col(store, "sessions"),        old.sessions,     "ses");
    ingestList(col(store, "classes"),         old.classes,      "cls");
    ingestList(col(store, "sections"),        old.sections,     "sec");
    ingestList(col(store, "subjects"),        old.subjects,     "sub");
    ingestList(col(store, "attendance"),      old.attendance,   "att");
    ingestList(col(store, "fee_receipts"),    old.feeReceipts,  "fr");
    ingestList(col(store, "fees_plan"),       old.feesPlan,     "fp");
    ingestList(col(store, "fee_heads"),       old.feeHeads,     "fh");
    ingestList(col(store, "fee_balances"),    old.feeBalances,  "fb");
    ingestList(col(store, "transport_routes"),old.transport,    "tr");
    ingestList(col(store, "pickup_points"),   old.pickupPoints, "pp");
    ingestList(col(store, "inventory_items"), old.inventory,    "inv");
    ingestList(col(store, "expenses"),        old.expenses,     "exp");
    ingestList(col(store, "expense_heads"),   old.expenseHeads, "eh");
    ingestList(col(store, "homework"),        old.homework,     "hw");
    ingestList(col(store, "alumni"),          old.alumni,       "alm");
    ingestList(col(store, "payroll_setup"),   old.payroll,      "pay");
    ingestList(col(store, "payslips"),        old.payslips,     "psl");
    ingestList(col(store, "notices"),         old.notices,      "ntc");
    ingestList(col(store, "examinations"),    old.examinations, "exam");
    ingestList(col(store, "exam_results"),    old.examResults,  "er");
    ingestList(col(store, "library"),         old.library,      "lib");

    { store; changelog = old.changelog };
  };
};
