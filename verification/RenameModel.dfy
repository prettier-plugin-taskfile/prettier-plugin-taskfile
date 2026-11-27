module RenameModel {
  predicate Unique(names: seq<string>)
  {
    forall i, j :: 0 <= i < j < |names| ==> names[i] != names[j]
  }

  predicate Safe(source: seq<string>, target: seq<string>)
  {
    |source| == |target| && Unique(source) && Unique(target)
  }

  function Find(names: seq<string>, name: string): nat
    requires name in names
    ensures Find(names, name) < |names|
    ensures names[Find(names, name)] == name
    decreases |names|
  {
    if names[0] == name then 0 else 1 + Find(names[1..], name)
  }

  lemma UniqueResolution(names: seq<string>, index: nat)
    requires Unique(names)
    requires index < |names|
    ensures Find(names, names[index]) == index
  {
    var found := Find(names, names[index]);
    if found < index {
      assert names[found] != names[index];
    } else if index < found {
      assert names[index] != names[found];
    }
  }

  // A plan covers the entire finite namespace, including unchanged names.
  method Commit(source: seq<string>, target: seq<string>)
      returns (accepted: bool, names: seq<string>)
    ensures accepted <==> Safe(source, target)
    ensures names == (if accepted then target else source)
    ensures accepted ==> Unique(names)
    ensures !accepted ==> names == source
  {
    accepted := Safe(source, target);
    names := if accepted then target else source;
  }

  function Rewrite(source: seq<string>, target: seq<string>, refs: seq<string>): seq<string>
    requires Safe(source, target)
    requires forall i :: 0 <= i < |refs| ==> refs[i] in source
    ensures |Rewrite(source, target, refs)| == |refs|
    ensures forall i :: 0 <= i < |refs| ==>
      Rewrite(source, target, refs)[i] == target[Find(source, refs[i])]
    decreases |refs|
  {
    if |refs| == 0 then []
    else [target[Find(source, refs[0])]] + Rewrite(source, target, refs[1..])
  }

  lemma ReferenceResolutionPreserved(
      source: seq<string>, target: seq<string>, refs: seq<string>, index: nat)
    requires Safe(source, target)
    requires forall i :: 0 <= i < |refs| ==> refs[i] in source
    requires index < |refs|
    ensures Find(target, Rewrite(source, target, refs)[index])
      == Find(source, refs[index])
  {
    UniqueResolution(target, Find(source, refs[index]));
  }

  predicate Known(source: seq<string>, refs: seq<string>)
  {
    forall i :: 0 <= i < |refs| ==> refs[i] in source
  }

  // The analyzer's blocked flag is an input, not a verified YAML analysis.
  method Apply(source: seq<string>, target: seq<string>, refs: seq<string>, blocked: bool)
      returns (accepted: bool, names: seq<string>, rewritten: seq<string>)
    ensures accepted <==> !blocked && Safe(source, target) && Known(source, refs)
    ensures names == (if accepted then target else source)
    ensures !accepted ==> rewritten == refs
    ensures |rewritten| == |refs|
    ensures accepted ==> Unique(names)
    ensures accepted ==> forall i :: 0 <= i < |refs| ==>
      rewritten[i] in names &&
      Find(names, rewritten[i]) == Find(source, refs[i])
  {
    accepted := !blocked && Safe(source, target) && Known(source, refs);
    if accepted {
      names := target;
      rewritten := Rewrite(source, target, refs);
      forall i | 0 <= i < |refs|
        ensures rewritten[i] in names &&
          Find(names, rewritten[i]) == Find(source, refs[i])
      {
        ReferenceResolutionPreserved(source, target, refs, i);
      }
    } else {
      names := source;
      rewritten := refs;
    }
  }

  function Normalize(normalizer: map<string, string>, name: string): string
    requires name in normalizer
  {
    normalizer[name]
  }

  // The finite table must explicitly contain every target as a fixed point.
  predicate CanonicalTable(normalizer: map<string, string>)
  {
    forall name :: name in normalizer ==>
      normalizer[name] in normalizer &&
      normalizer[normalizer[name]] == normalizer[name]
  }

  lemma NormalizationIdempotent(normalizer: map<string, string>, name: string)
    requires CanonicalTable(normalizer)
    requires name in normalizer
    ensures Normalize(normalizer, name) in normalizer
    ensures Normalize(normalizer, Normalize(normalizer, name))
      == Normalize(normalizer, name)
  {
  }

  method Main() {
    var accepted, names := Commit(["buildApp", "test"], ["build-app", "test"]);
    assert accepted && names == ["build-app", "test"];
    var refs := Rewrite(["buildApp", "test"], names, ["test", "buildApp", "buildApp"]);
    assert refs == ["test", "build-app", "build-app"];
    ReferenceResolutionPreserved(["buildApp", "test"], names, ["test", "buildApp"], 1);

    var collision := ["build-app", "build-app"];
    assert collision[0] == collision[1];
    assert !Unique(collision);
    accepted, names := Commit(["buildApp", "build-app"], collision);
    assert !accepted && names == ["buildApp", "build-app"];
    var duplicate := ["duplicate", "duplicate"];
    assert duplicate[0] == duplicate[1];
    assert !Unique(duplicate);
    accepted, names := Commit(duplicate, ["one", "two"]);
    assert !accepted && names == ["duplicate", "duplicate"];
    accepted, names := Commit(["one"], []);
    assert !accepted && names == ["one"];
    accepted, names := Commit([], []);
    assert accepted && names == [];
    accepted, names := Commit(["a", "b"], ["b", "a"]);
    assert accepted && names == ["b", "a"];
    refs := Rewrite(["a", "b"], names, ["a", "b"]);
    assert refs == ["b", "a"];
    ReferenceResolutionPreserved(["a", "b"], names, ["a", "b"], 0);

    var normalizer := map["buildApp" := "build-app", "build-app" := "build-app"];
    assert CanonicalTable(normalizer);
    NormalizationIdempotent(normalizer, "buildApp");
    var ok, appliedNames, appliedRefs :=
      Apply(["a", "b"], ["b", "a"], ["a", "b"], false);
    assert ok && appliedNames == ["b", "a"] && appliedRefs == ["b", "a"];
    ok, appliedNames, appliedRefs := Apply(["a"], ["b"], ["a"], true);
    assert !ok && appliedNames == ["a"] && appliedRefs == ["a"];
    var unknownRefs := ["unknown"];
    assert unknownRefs[0] !in ["a"];
    assert !Known(["a"], unknownRefs);
    ok, appliedNames, appliedRefs := Apply(["a"], ["b"], unknownRefs, false);
    assert !ok && appliedNames == ["a"] && appliedRefs == ["unknown"];
    print "rename model executable sample completed\n";
  }
}
