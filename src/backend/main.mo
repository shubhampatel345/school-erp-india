import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";


actor {
  // ── Stable storage for all ERP collections ──────────────────────────────
  // Each collection stores JSON-encoded records as Text.
  // This keeps the API simple and avoids Candid type churn as schemas evolve.

  let students     : List.List<Text> = List.empty<Text>();
  let staff        : List.List<Text> = List.empty<Text>();
  let sessions     : List.List<Text> = List.empty<Text>();
  let classes      : List.List<Text> = List.empty<Text>();
  let sections     : List.List<Text> = List.empty<Text>();
  let subjects     : List.List<Text> = List.empty<Text>();
  let attendance   : List.List<Text> = List.empty<Text>();
  let feeReceipts  : List.List<Text> = List.empty<Text>();
  let feesPlan     : List.List<Text> = List.empty<Text>();
  let feeHeads     : List.List<Text> = List.empty<Text>();
  let feeBalances  : List.List<Text> = List.empty<Text>();
  let transport    : List.List<Text> = List.empty<Text>();
  let pickupPoints : List.List<Text> = List.empty<Text>();
  let inventory    : List.List<Text> = List.empty<Text>();
  let expenses     : List.List<Text> = List.empty<Text>();
  let expenseHeads : List.List<Text> = List.empty<Text>();
  let homework     : List.List<Text> = List.empty<Text>();
  let alumni       : List.List<Text> = List.empty<Text>();
  let payroll      : List.List<Text> = List.empty<Text>();
  let payslips     : List.List<Text> = List.empty<Text>();
  let notices      : List.List<Text> = List.empty<Text>();
  let examinations : List.List<Text> = List.empty<Text>();
  let examResults  : List.List<Text> = List.empty<Text>();
  let library      : List.List<Text> = List.empty<Text>();
  let changelog    : List.List<Text> = List.empty<Text>();

  // ── Collection registry ───────────────────────────────────────────────────

  private func getList(name : Text) : List.List<Text> {
    switch name {
      case "students"         students;
      case "staff"            staff;
      case "sessions"         sessions;
      case "classes"          classes;
      case "sections"         sections;
      case "subjects"         subjects;
      case "attendance"       attendance;
      case "fee_receipts"     feeReceipts;
      case "fees_plan"        feesPlan;
      case "fee_heads"        feeHeads;
      case "fee_headings"     feeHeads;
      case "fee_balances"     feeBalances;
      case "transport_routes" transport;
      case "pickup_points"    pickupPoints;
      case "inventory_items"  inventory;
      case "expenses"         expenses;
      case "expense_heads"    expenseHeads;
      case "homework"         homework;
      case "alumni"           alumni;
      case "payroll_setup"    payroll;
      case "payslips"         payslips;
      case "notices"          notices;
      case "examinations"     examinations;
      case "exam_results"     examResults;
      case "library"          library;
      case _                  students;
    }
  };

  // ── JSON id extraction ────────────────────────────────────────────────────
  // Extract the value of "id":"..." from a JSON string.
  // Returns "" if not found.

  private func extractId(json : Text) : Text {
    let needle = "\"id\":\"";
    switch (json.stripStart(#text needle)) {
      case null {
        // Try numeric id: "id":123
        let needle2 = "\"id\":";
        switch (json.stripStart(#text needle2)) {
          case null "";
          case (?rest) {
            // Collect digits until non-digit
            var id = "";
            var done = false;
            for (ch in rest.toIter()) {
              if (not done) {
                if (ch >= '0' and ch <= '9') {
                  id #= Text.fromChar(ch);
                } else {
                  done := true;
                };
              };
            };
            id
          };
        }
      };
      case (?rest) {
        // Collect characters until closing quote
        var id = "";
        var done = false;
        for (ch in rest.toIter()) {
          if (not done) {
            if (ch == '\"') {
              done := true;
            } else {
              id #= Text.fromChar(ch);
            };
          };
        };
        id
      };
    }
  };

  // ── Utility: find index of item with matching id field ───────────────────

  private func findIndexById(list : List.List<Text>, id : Text) : ?Nat {
    if (id == "") return null;
    var idx : Nat = 0;
    var found : ?Nat = null;
    list.forEach(func(item : Text) {
      if (found == null) {
        if (extractId(item) == id) {
          found := ?idx;
        };
        idx += 1;
      };
    });
    found
  };

  // ── Helper: build JSON array from list ───────────────────────────────────

  private func toJsonArray(list : List.List<Text>) : Text {
    let items = list.toArray();
    if (items.size() == 0) return "[]";
    var r = "[";
    var first = true;
    for (item in items.vals()) {
      if (not first) r #= ",";
      r #= item;
      first := false;
    };
    r #= "]";
    r
  };

  // ── Ping ─────────────────────────────────────────────────────────────────

  public query func ping() : async Text {
    "SHUBH SCHOOL ERP backend v2 — canister storage active";
  };

  // ── Generic collection CRUD ──────────────────────────────────────────────

  /// Return all records in a collection as a JSON array string
  public query func listRecords(collection : Text) : async Text {
    toJsonArray(getList(collection))
  };

  /// Return a single record by id (JSON string or empty string if not found)
  public query func getRecord(collection : Text, id : Text) : async Text {
    let list = getList(collection);
    switch (findIndexById(list, id)) {
      case null "";
      case (?idx) {
        // list.at(idx) traps on OOB which is safe here since idx came from findIndexById
        list.at(idx)
      };
    }
  };

  /// Create a new record. Returns "ok".
  public func createRecord(collection : Text, recordJson : Text) : async Text {
    let list = getList(collection);
    list.add(recordJson);
    "ok"
  };

  /// Update an existing record by id. Returns "ok" or "not_found".
  public func updateRecord(collection : Text, id : Text, recordJson : Text) : async Text {
    let list = getList(collection);
    switch (findIndexById(list, id)) {
      case null "not_found";
      case (?idx) {
        list.put(idx, recordJson);
        "ok"
      };
    }
  };

  /// Delete a record by id. Returns "ok" or "not_found".
  public func deleteRecord(collection : Text, id : Text) : async Text {
    let list = getList(collection);
    switch (findIndexById(list, id)) {
      case null "not_found";
      case (?idx) {
        // Rebuild list without the item at idx
        let newList = List.empty<Text>();
        var i : Nat = 0;
        list.forEach(func(item : Text) {
          if (i != idx) newList.add(item);
          i += 1;
        });
        list.clear();
        newList.forEach(func(item : Text) { list.add(item) });
        "ok"
      };
    }
  };

  /// Upsert a record: update if id exists, create otherwise. Returns "ok".
  public func upsertRecord(collection : Text, id : Text, recordJson : Text) : async Text {
    let list = getList(collection);
    switch (findIndexById(list, id)) {
      case null {
        list.add(recordJson);
        "ok"
      };
      case (?idx) {
        list.put(idx, recordJson);
        "ok"
      };
    }
  };

  /// Batch upsert array of JSON records. Returns count upserted.
  public func batchUpsert(collection : Text, recordsJson : [Text]) : async Nat {
    let list = getList(collection);
    var count : Nat = 0;
    for (recordJson in recordsJson.vals()) {
      let id = extractId(recordJson);
      switch (findIndexById(list, id)) {
        case null {
          list.add(recordJson);
        };
        case (?idx) {
          list.put(idx, recordJson);
        };
      };
      count += 1;
    };
    count
  };

  /// Replace entire collection with new records. Returns count.
  public func replaceCollection(collection : Text, recordsJson : [Text]) : async Nat {
    let list = getList(collection);
    list.clear();
    for (item in recordsJson.vals()) {
      list.add(item);
    };
    list.size()
  };

  /// Return record counts for all collections (for dashboard stats)
  public query func getCounts() : async Text {
    "{" #
      "\"students\":"         # students.size().toText()     # "," #
      "\"staff\":"            # staff.size().toText()        # "," #
      "\"sessions\":"         # sessions.size().toText()     # "," #
      "\"classes\":"          # classes.size().toText()      # "," #
      "\"sections\":"         # sections.size().toText()     # "," #
      "\"subjects\":"         # subjects.size().toText()     # "," #
      "\"attendance\":"       # attendance.size().toText()   # "," #
      "\"fee_receipts\":"     # feeReceipts.size().toText()  # "," #
      "\"fees_plan\":"        # feesPlan.size().toText()     # "," #
      "\"fee_heads\":"        # feeHeads.size().toText()     # "," #
      "\"transport_routes\":" # transport.size().toText()    # "," #
      "\"inventory_items\":"  # inventory.size().toText()    # "," #
      "\"expenses\":"         # expenses.size().toText()     # "," #
      "\"homework\":"         # homework.size().toText()     # "," #
      "\"alumni\":"           # alumni.size().toText()       # "," #
      "\"payroll_setup\":"    # payroll.size().toText()      # "," #
      "\"payslips\":"         # payslips.size().toText()     # "," #
      "\"notices\":"          # notices.size().toText()      # "," #
      "\"examinations\":"     # examinations.size().toText() # "," #
      "\"library\":"          # library.size().toText()      #
    "}"
  };

  /// Fetch all collections in one shot (WhatsApp-style initial load).
  public query func fetchAll() : async Text {
    "{" #
      "\"students\":"         # toJsonArray(students)     # "," #
      "\"staff\":"            # toJsonArray(staff)        # "," #
      "\"sessions\":"         # toJsonArray(sessions)     # "," #
      "\"classes\":"          # toJsonArray(classes)      # "," #
      "\"sections\":"         # toJsonArray(sections)     # "," #
      "\"subjects\":"         # toJsonArray(subjects)     # "," #
      "\"attendance\":"       # toJsonArray(attendance)   # "," #
      "\"fee_receipts\":"     # toJsonArray(feeReceipts)  # "," #
      "\"fees_plan\":"        # toJsonArray(feesPlan)     # "," #
      "\"fee_heads\":"        # toJsonArray(feeHeads)     # "," #
      "\"fee_balances\":"     # toJsonArray(feeBalances)  # "," #
      "\"transport_routes\":" # toJsonArray(transport)    # "," #
      "\"pickup_points\":"    # toJsonArray(pickupPoints) # "," #
      "\"inventory_items\":"  # toJsonArray(inventory)    # "," #
      "\"expenses\":"         # toJsonArray(expenses)     # "," #
      "\"expense_heads\":"    # toJsonArray(expenseHeads) # "," #
      "\"homework\":"         # toJsonArray(homework)     # "," #
      "\"alumni\":"           # toJsonArray(alumni)       # "," #
      "\"payroll_setup\":"    # toJsonArray(payroll)      # "," #
      "\"payslips\":"         # toJsonArray(payslips)     # "," #
      "\"notices\":"          # toJsonArray(notices)      # "," #
      "\"examinations\":"     # toJsonArray(examinations) # "," #
      "\"exam_results\":"     # toJsonArray(examResults)  # "," #
      "\"library\":"          # toJsonArray(library)      #
    "}"
  };

  /// Return recent changelog entries as JSON array (last 100)
  public query func getChangelog() : async Text {
    let items = changelog.toArray();
    let len = items.size();
    let start : Nat = if (len > 100) len - 100 else 0;
    var result = "[";
    var first = true;
    var i : Nat = 0;
    for (item in items.vals()) {
      if (i >= start) {
        if (not first) result #= ",";
        result #= item;
        first := false;
      };
      i += 1;
    };
    result #= "]";
    result
  };
};
