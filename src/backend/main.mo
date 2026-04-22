import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Migration "migration";

(with migration = Migration.run)
actor {

  // ── Storage ──────────────────────────────────────────────────────────────
  // Outer map: collection name → inner map
  // Inner map:  record id      → JSON text
  // Enhanced orthogonal persistence keeps all state across upgrades.

  let store : Map.Map<Text, Map.Map<Text, Text>> = Map.empty<Text, Map.Map<Text, Text>>();

  // Changelog: each entry is a JSON object with id/collection/op/timestamp
  let changelog : List.List<Text> = List.empty<Text>();

  // ── Private helpers ───────────────────────────────────────────────────────

  // Get or lazily create the inner map for a collection.
  private func col(name : Text) : Map.Map<Text, Text> {
    switch (store.get(name)) {
      case (?m) m;
      case null {
        let m = Map.empty<Text, Text>();
        store.add(name, m);
        m;
      };
    };
  };

  // Append a changelog entry (kept to last 1000).
  private func logChange(collection : Text, id : Text, op : Text, data : Text) {
    let ts = Time.now();
    let entry = "{\"collection\":\"" # collection # "\",\"id\":\"" # id #
                "\",\"op\":\"" # op # "\",\"timestamp\":" # ts.toText() #
                ",\"data\":" # data # "}";
    changelog.add(entry);
    // Trim to last 1000 entries to avoid unbounded growth.
    if (changelog.size() > 1000) {
      changelog.truncate(1000);
    };
  };

  // ── Public API ────────────────────────────────────────────────────────────

  /// Health check.
  public query func ping() : async Text {
    "SHUBH SCHOOL ERP canister v3 — canister storage active";
  };

  /// Create a new record. Fails if the id already exists.
  public func createRecord(collection : Text, id : Text, data : Text)
      : async { ok : Bool; err : Text } {
    if (id == "") return { ok = false; err = "id must not be empty" };
    let m = col(collection);
    switch (m.get(id)) {
      case (?_) { { ok = false; err = "record already exists: " # id } };
      case null {
        m.add(id, data);
        logChange(collection, id, "create", data);
        { ok = true; err = "" };
      };
    };
  };

  /// Update an existing record. Returns err if not found.
  public func updateRecord(collection : Text, id : Text, data : Text)
      : async { ok : Bool; err : Text } {
    if (id == "") return { ok = false; err = "id must not be empty" };
    let m = col(collection);
    switch (m.get(id)) {
      case null { { ok = false; err = "record not found: " # id } };
      case (?_) {
        m.add(id, data);
        logChange(collection, id, "update", data);
        { ok = true; err = "" };
      };
    };
  };

  /// Delete a record by id.
  public func deleteRecord(collection : Text, id : Text)
      : async { ok : Bool; err : Text } {
    if (id == "") return { ok = false; err = "id must not be empty" };
    let m = col(collection);
    switch (m.get(id)) {
      case null { { ok = false; err = "record not found: " # id } };
      case (?data) {
        m.remove(id);
        logChange(collection, id, "delete", data);
        { ok = true; err = "" };
      };
    };
  };

  /// Get a single record by id. Returns null if not found.
  public query func getRecord(collection : Text, id : Text) : async ?Text {
    switch (store.get(collection)) {
      case null null;
      case (?m) m.get(id);
    };
  };

  /// List all records in a collection as an array of JSON strings.
  public query func listRecords(collection : Text) : async [Text] {
    switch (store.get(collection)) {
      case null [];
      case (?m) m.values().toArray();
    };
  };

  /// Paginated list. offset is 0-based.
  public query func listRecordsPaginated(collection : Text, offset : Nat, limit : Nat)
      : async { records : [Text]; total : Nat } {
    switch (store.get(collection)) {
      case null { { records = []; total = 0 } };
      case (?m) {
        let total = m.size();
        let all = m.values().toArray();
        let end = Nat.min(offset + limit, total);
        let records : [Text] = if (offset >= total) {
          [];
        } else {
          all.sliceToArray(offset.toInt(), end.toInt());
        };
        { records; total };
      };
    };
  };

  /// Upsert a batch of records (insert or overwrite by id).
  public func batchUpsert(collection : Text, records : [{ id : Text; data : Text }])
      : async { ok : Bool; count : Nat; err : Text } {
    let m = col(collection);
    var count : Nat = 0;
    for (r in records.vals()) {
      if (r.id != "") {
        let op = if (m.containsKey(r.id)) "update" else "create";
        m.add(r.id, r.data);
        logChange(collection, r.id, op, r.data);
        count += 1;
      };
    };
    { ok = true; count; err = "" };
  };

  /// Delete an entire collection. Returns number of records removed.
  public func deleteCollection(collection : Text) : async { ok : Bool; count : Nat } {
    switch (store.get(collection)) {
      case null { { ok = true; count = 0 } };
      case (?m) {
        let count = m.size();
        m.clear();
        store.remove(collection);
        { ok = true; count };
      };
    };
  };

  /// Return count per collection.
  public query func getCounts() : async [(Text, Nat)] {
    store.entries()
      .map<(Text, Map.Map<Text, Text>), (Text, Nat)>(
        func((k, v)) { (k, v.size()) }
      ).toArray()
  };

  /// Return changelog entries since a given timestamp (nanoseconds).
  /// Pass 0 to get all entries.
  public query func getChangelog(since : Nat) : async [Text] {
    if (since == 0) return changelog.toArray();
    // Filter entries whose timestamp >= since.
    // We do a simple linear scan since changelog is bounded to 1000 entries.
    let sinceInt : Int = since.toInt();
    changelog.filter(func(entry : Text) : Bool {
      // Quick parse: look for "timestamp": after the field key.
      let needle = "\"timestamp\":";
      switch (entry.stripStart(#text "{")) {
        case null false;
        case (?_) {
          // Find timestamp value by scanning for the key.
          var found = false;
          var check = entry;
          label search loop {
            switch (check.stripStart(#text needle)) {
              case (?rest) {
                // Parse the integer that follows.
                var numText = "";
                var done = false;
                for (ch in rest.toIter()) {
                  if (not done) {
                    if ((ch >= '0' and ch <= '9') or ch == '-') {
                      numText #= Text.fromChar(ch);
                    } else {
                      done := true;
                    };
                  };
                };
                switch (Int.fromText(numText)) {
                  case (?ts) { found := ts >= sinceInt };
                  case null  { found := false };
                };
                break search;
              };
              case null {
                // Advance one character and retry.
                switch (check.toIter().next()) {
                  case null { break search };
                  case (?_) {
                    // Drop first char.
                    let chars = check.toArray();
                    if (chars.size() <= 1) { break search };
                    check := Text.fromArray(chars.sliceToArray(1, chars.size()));
                  };
                };
              };
            };
          };
          found
        };
      }
    }).toArray()
  };

  /// Export all data for backup. Returns array of (collection, [(id, data)]).
  public query func exportAll() : async [(Text, [(Text, Text)])] {
    store.entries()
      .map<(Text, Map.Map<Text, Text>), (Text, [(Text, Text)])>(
        func((coll, m)) { (coll, m.toArray()) }
      ).toArray()
  };

  /// Import all data from a backup. Merges (upserts) all records.
  public func importAll(data : [(Text, [(Text, Text)])]) : async { ok : Bool; count : Nat } {
    var total : Nat = 0;
    for ((collection, records) in data.vals()) {
      let m = col(collection);
      for ((id, json) in records.vals()) {
        if (id != "") {
          m.add(id, json);
          total += 1;
        };
      };
    };
    { ok = true; count = total };
  };
};
