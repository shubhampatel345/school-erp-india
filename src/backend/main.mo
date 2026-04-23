import Migration "migration";

(with migration = Migration.run)
actor {
  // Minimal health-check endpoint — cPanel/PHP/MySQL handles all data.
  public query func ping() : async Bool {
    true
  };
}
