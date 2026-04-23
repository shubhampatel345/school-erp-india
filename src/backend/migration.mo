// Migration module: explicitly discard stable variables from the previous
// complex backend version that had `store` and `changelog`.
module {
  type OldNode<K, V> = {
    #internal : { children : [var ?OldNode<K, V>]; data : OldData<K, V> };
    #leaf : { data : OldData<K, V> };
  };
  type OldData<K, V> = { var count : Nat; kvs : [var ?(K, V)] };
  type OldMap<K, V> = { var root : OldNode<K, V>; var size : Nat };
  type OldChangelog = {
    var blockIndex : Nat;
    var blocks : [var [var ?Text]];
    var elementIndex : Nat;
  };

  public type OldState = {
    store : OldMap<Text, OldMap<Text, Text>>;
    changelog : OldChangelog;
  };

  // Consume old stable fields and return an empty record (no new stable state).
  public func run(_ : OldState) : {} { {} };
};
