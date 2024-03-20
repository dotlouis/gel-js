import { bench } from "@arktype/attest";

import e from "./dbschema/edgeql-js";

bench("e.literal: scalar", () => {
  const lit = e.literal(e.int32, 42);
  return {} as typeof lit;
}).types([4468, "instantiations"]);

bench("e.int32: scalar", () => {
  const lit = e.int32(42);
  return {} as typeof lit;
}).types([558, "instantiations"]);

bench("e.str: scalar", () => {
  const lit = e.str("abcd");
  return {} as typeof lit;
}).types([897, "instantiations"]);

bench("e.literal: array literal", () => {
  const lit = e.literal(e.array(e.str), ["abcd"]);
  return {} as typeof lit;
}).types([7568, "instantiations"]);

bench("e.array: array literal", () => {
  const lit = e.array([e.str("abcd")]);
  return {} as typeof lit;
}).types([2606, "instantiations"]);

bench("e.literal: named tuple literal", () => {
  const lit = e.literal(e.tuple({ str: e.str }), {
    str: "asdf",
  });
  return {} as typeof lit;
}).types([16528, "instantiations"]);

bench("e.tuple: named tuple literal", () => {
  const lit = e.tuple({ str: e.str("asdf") });
  return {} as typeof lit;
}).types([9831, "instantiations"]);

bench("e.literal: tuple literal", () => {
  const lit = e.literal(e.tuple([e.str, e.int32]), ["asdf", 42]);
  return {} as typeof lit;
}).types([13125, "instantiations"]);

bench("e.tuple: tuple literal", () => {
  const lit = e.tuple([e.str("asdf"), e.int32(42)]);
  return {} as typeof lit;
}).types([4889, "instantiations"]);

bench("e.literal: array of tuples", () => {
  const lit = e.literal(e.array(e.tuple([e.str, e.int32])), [
    ["asdf", 42],
    ["qwer", 43],
  ]);
  return {} as typeof lit;
}).types([15721, "instantiations"]);

bench("e.array: array of tuples", () => {
  const lit = e.array([
    e.tuple([e.str("asdf"), e.int32(42)]),
    e.tuple([e.str("qwer"), e.int32(43)]),
  ]);
  return {} as typeof lit;
}).types([22894, "instantiations"]);

bench("base type: array", () => {
  const baseType = e.array(e.str);
  return {} as typeof baseType;
}).types([351, "instantiations"]);

bench("base type: named tuple", () => {
  const baseType = e.tuple({ str: e.str });
  return {} as typeof baseType;
}).types([3545, "instantiations"]);

bench("select: scalar", () => {
  const query = e.select(e.int32(42));
  return {} as typeof query;
}).types([1177, "instantiations"]);

bench("select: free object", () => {
  const query = e.select({ meaning: e.int32(42) });
  return {} as typeof query;
}).types([2033, "instantiations"]);

bench("select: id only", () => {
  const query = e.select(e.User, () => ({ id: true }));
  return {} as typeof query;
}).types([3702, "instantiations"]);

bench("select: filtered", () => {
  const query = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  return {} as typeof query;
}).types([5039, "instantiations"]);

bench("select: nested", () => {
  const user = e.select(e.User, () => ({
    filter_single: { id: e.uuid("123") },
  }));
  const query = e.select(user, () => ({ id: true }));

  return {} as typeof query;
}).types([6057, "instantiations"]);

bench("select: complex", () => {
  const query = e.select(e.Movie, () => ({
    id: true,
    characters: (char) => ({
      name: true,
      "@character_name": true,
      filter: e.op(char["@character_name"], "=", "Tony Stark"),
    }),
  }));
  return {} as typeof query;
}).types([6374, "instantiations"]);

bench("select: with filter", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: {
      id: true,
      name: true,
    },
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6447, "instantiations"]);

bench("select: with order", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: (v) => ({
      id: true,
      name: true,
      order_by: v.name,
    }),
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6786, "instantiations"]);

bench("select: with limit", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: () => ({
      id: true,
      name: true,
      limit: 1,
    }),
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6510, "instantiations"]);

bench("select: with offset", () => {
  const query = e.select(e.Hero, (hero) => ({
    name: true,
    villains: (v) => ({
      id: true,
      name: true,
      offset: 1,
    }),
    filter_single: e.op(hero.name, "=", "Peter Parker"),
  }));
  return {} as typeof query;
}).types([6553, "instantiations"]);

bench("params select", () => {
  const query = e.params({ name: e.str }, (params) =>
    e.select(e.Hero, (hero) => ({
      name: true,
      villains: () => ({
        id: true,
        name: true,
      }),
      filter_single: e.op(hero.name, "=", params.name),
    }))
  );
  return {} as typeof query;
}).types([12010, "instantiations"]);
