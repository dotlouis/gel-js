import type { Executor } from "edgedb/dist/ifaces";
import type { $expr_PathNode, $expr_TypeIntersection, $pathify } from "./path";
import type { $expr_Literal } from "./literal";
import type { $expr_Operator } from "./funcops";
import type {
  typeutil,
  Cardinality,
  ExpressionKind,
} from "edgedb/dist/reflection/index";
import { TypeKind } from "edgedb/dist/reflection/index";
import type { cardutil } from "./cardinality";
import type { Range, MultiRange } from "edgedb";
import type { $Shape, normaliseShape } from "./select";

//////////////////
// BASETYPE
//////////////////

export interface BaseType {
  __kind__: TypeKind;
  __name__: string;
}
export type BaseTypeSet = {
  __element__: BaseType;
  __cardinality__: Cardinality;
};
export type BaseTypeTuple = typeutil.tupleOf<BaseType>;

//////////////////
// SCALARTYPE
//////////////////

export interface ScalarType<
  Name extends string = string,
  TsType = any,
  TsArgType = TsType,
  TsConstType extends TsType = TsType,
> extends BaseType {
  __kind__: TypeKind.scalar;
  __tstype__: TsType;
  __tsargtype__: TsArgType;
  __tsconsttype__: TsConstType;
  __name__: Name;
}

export type scalarTypeWithConstructor<
  S extends ScalarType,
  ExtraTsTypes = never,
> = S &
  (<T extends S["__tstype__"] | ExtraTsTypes>(
    val: T,
  ) => $expr_Literal<
    Omit<S, "__tsconsttype__"> & {
      __tsconsttype__: T extends S["__tstype__"] ? T : S["__tstype__"];
    }
  >);

type $jsonDestructure<Set extends TypeSet> =
  Set extends TypeSet<ScalarType<"std::json">>
    ? {
        [path: string]: $expr_Operator<
          Set["__element__"],
          Set["__cardinality__"]
        >;
      } & {
        destructure<T extends TypeSet<ScalarType<"std::str">> | string>(
          path: T,
        ): $expr_Operator<
          Set["__element__"],
          cardutil.multiplyCardinalities<
            Set["__cardinality__"],
            T extends TypeSet ? T["__cardinality__"] : Cardinality.One
          >
        >;
      }
    : unknown;

////////////////////
// SETS AND EXPRESSIONS
////////////////////

export interface TypeSet<
  T extends BaseType = BaseType,
  Card extends Cardinality = Cardinality,
> {
  __element__: T;
  __cardinality__: Card;
}

// utility function for creating set
export function $toSet<Root extends BaseType, Card extends Cardinality>(
  root: Root,
  card: Card,
): TypeSet<Root, Card> {
  return {
    __element__: root,
    __cardinality__: card,
  };
}

export type Expression<
  Set extends TypeSet = TypeSet,
  Runnable extends boolean = true,
> = Set &
  (BaseType extends Set["__element__"] // short-circuit non-specific types
    ? {
        run(cxn: Executor): any;
        runJSON(cxn: Executor): any;
        toEdgeQL(): string;
        is: any;
        assert_single: any;
        // warning: any;
      }
    : $pathify<Set> &
        ExpressionMethods<stripSet<Set>> &
        (Runnable extends true
          ? {
              run(cxn: Executor): Promise<setToTsType<Set>>;
              runJSON(cxn: Executor): Promise<string>;
            }
          : unknown) &
        $tuplePathify<Set> &
        $arrayLikeIndexify<Set> &
        $jsonDestructure<Set>);

export type stripSet<T> = "__element__" extends keyof T
  ? "__cardinality__" extends keyof T
    ? {
        __element__: T["__element__"];
        __cardinality__: T["__cardinality__"];
      }
    : T
  : T;

// export type stripSet<T> = T extends {__element__: any; __cardinality__: any}
//   ? {
//       __element__: T["__element__"];
//       __cardinality__: T["__cardinality__"];
//     }
//   : any;

export type stripSetShape<T> = {
  [k in keyof T]: stripSet<T[k]>;
};

// importing the actual alias from
// generated/modules/std didn't work.
// returned 'any' every time
export type assert_single<
  El extends BaseType,
  Card extends Cardinality,
> = Expression<{
  __element__: El; // ["__element__"];
  __cardinality__: Card; // cardutil.overrideUpperBound<
  // Expr["__cardinality__"], "One"
  // >;
  __kind__: ExpressionKind.Function;
  __name__: "std::assert_single";
  __args__: TypeSet[]; // discard wrapped expression
  __namedargs__: object;
}>;

export type ExpressionMethods<Set extends TypeSet> = {
  toEdgeQL(): string;

  is<T extends ObjectTypeSet>(
    ixn: T,
  ): $expr_TypeIntersection<
    Set["__cardinality__"],
    // might cause performance issues
    ObjectType<
      T["__element__"]["__name__"],
      T["__element__"]["__pointers__"],
      { id: true },
      T["__element__"]["__exclusives__"],
      T["__element__"]["__polyTypenames__"]
    >
  >;
  assert_single(): assert_single<
    ObjectType extends Set["__element__"]
      ? ObjectType<string, ObjectTypePointers, null>
      : Set["__element__"],
    Cardinality.AtMostOne
    // cardutil.overrideUpperBound<Set["__cardinality__"], "One">
  >;
};

//////////////////
// ENUMTYPE
//////////////////
export interface EnumType<
  Name extends string = string,
  Values extends [string, ...string[]] = [string, ...string[]],
> extends BaseType {
  __kind__: TypeKind.enum;
  __tstype__: Values[number];
  __name__: Name;
  __values__: Values;
}

//////////////////
// OBJECTTYPE
//////////////////

export type ObjectTypeSet = TypeSet<ObjectType, Cardinality>;
export type ObjectTypeExpression = TypeSet<ObjectType, Cardinality>;

export type ExclusiveTuple = typeutil.tupleOf<{
  [k: string]: TypeSet;
}>;
export interface ObjectType<
  Name extends string = string,
  Pointers extends ObjectTypePointers = ObjectTypePointers,
  Shape extends object | null = any,
  Exclusives extends ExclusiveTuple = ExclusiveTuple,
  PolyTypenames extends string = string,
> extends BaseType {
  __kind__: TypeKind.object;
  __name__: Name;
  __pointers__: Pointers;
  __shape__: Shape;
  __exclusives__: Exclusives;
  __polyTypenames__: PolyTypenames;
}

export type PropertyTypes =
  | ScalarType
  | EnumType
  | ArrayType
  | TupleType
  | NamedTupleType;

export type SomeType =
  | ScalarType
  | EnumType
  | ArrayType
  | TupleType
  | ObjectType
  | NamedTupleType
  | RangeType
  | MultiRangeType;

export interface PropertyDesc<
  Type extends BaseType = BaseType,
  Card extends Cardinality = Cardinality,
  Exclusive extends boolean = boolean,
  Computed extends boolean = boolean,
  Readonly extends boolean = boolean,
  HasDefault extends boolean = boolean,
> {
  __kind__: "property";
  target: Type;
  cardinality: Card;
  exclusive: Exclusive;
  computed: Computed;
  readonly: Readonly;
  hasDefault: HasDefault;
}

export type $scopify<Type extends ObjectType> = $expr_PathNode<
  TypeSet<Type, Cardinality.One>
  // null,
  // true // exclusivity
>;

export type PropertyShape = {
  [k: string]: PropertyDesc;
};

export interface LinkDesc<
  Type extends ObjectType = any,
  Card extends Cardinality = Cardinality,
  LinkProps extends PropertyShape = any,
  Exclusive extends boolean = boolean,
  Computed extends boolean = boolean,
  Readonly extends boolean = boolean,
  HasDefault extends boolean = boolean,
> {
  __kind__: "link";
  target: Type;
  cardinality: Card;
  properties: LinkProps;
  exclusive: Exclusive;
  computed: Computed;
  readonly: Readonly;
  hasDefault: HasDefault;
}

export type ObjectTypePointers = {
  [k: string]: PropertyDesc | LinkDesc;
};

export type stripBacklinks<T extends ObjectTypePointers> = {
  [k in keyof T]: k extends `<${string}` ? never : T[k];
};

export type omitBacklinks<T extends string | number | symbol> =
  T extends `<${string}` ? never : T extends string ? T : never;

export type stripNonUpdateables<T extends ObjectTypePointers> = {
  [k in keyof T]: [T[k]["computed"]] extends [true]
    ? never
    : [T[k]["readonly"]] extends [true]
      ? never
      : k extends "__type__"
        ? never
        : k extends "id"
          ? never
          : T[k];
};

export type stripNonInsertables<T extends ObjectTypePointers> = {
  [k in keyof T]: [T[k]["computed"]] extends [true]
    ? never
    : [k] extends ["__type__"]
      ? never
      : T[k];
};

type shapeElementToTs<
  Pointer extends PropertyDesc | LinkDesc,
  Element,
  ParentTypeName extends string | null = null,
> = [Element] extends [true]
  ? pointerToTsType<Pointer>
  : [Element] extends [false]
    ? never
    : [Element] extends [boolean]
      ? pointerToTsType<Pointer> | undefined
      : Element extends TypeSet
        ? setToTsType<TypeSet<Element["__element__"], Pointer["cardinality"]>>
        : Pointer extends LinkDesc
          ? Element extends object
            ? computeTsTypeCard<
                typeutil.flatten<
                  ([ParentTypeName] extends [string]
                    ? Element extends { name: true }
                      ? { name: ParentTypeName }
                      : {}
                    : {}) &
                    computeObjectShape<
                      Pointer["target"]["__pointers__"] & Pointer["properties"],
                      Element,
                      Pointer["target"]["__polyTypenames__"]
                    >
                >,
                Pointer["cardinality"]
              >
            : never
          : never;

// Element extends (scope: any) => any
// ? Pointer["target"] extends ObjectType
//   ? computeObjectShape<
//       Pointer["target"]["__pointers__"],
//       ReturnType<Element>
//     >
//   : never
// : Element extends object
// ? Pointer["target"] extends ObjectType
//   ? computeObjectShape<Pointer["target"]["__pointers__"], Element>
//   : never
// : never;

export type $expr_PolyShapeElement<
  PolyType extends ObjectTypeSet = ObjectTypeSet,
  ShapeElement = any,
> = {
  __kind__: ExpressionKind.PolyShapeElement;
  __polyType__: PolyType;
  __shapeElement__: ShapeElement;
};

export type computeObjectShape<
  Pointers extends ObjectTypePointers,
  Shape,
  TypeName extends string,
> = keyof Shape extends never
  ? { id: string }
  : typeutil.flatten<{
      [k in keyof Shape as Shape[k] extends $expr_PolyShapeElement
        ? never
        : k]: [k] extends [keyof Pointers]
        ? shapeElementToTs<
            Pointers[k],
            Shape[k],
            k extends "__type__" ? TypeName : null
          >
        : Shape[k] extends TypeSet
          ? setToTsType<Shape[k]>
          : never;
    }> &
      ({
        [k in keyof Shape as Shape[k] extends $expr_PolyShapeElement
          ? k
          : never]: Shape[k];
      } extends infer PolyEls
        ? keyof PolyEls extends never
          ? {}
          : getPolyElTypes<PolyEls[keyof PolyEls]> extends infer PolyTypeName
            ?
                | (Exclude<TypeName, PolyTypeName> extends never
                    ? never
                    : {
                        __typename: Exclude<TypeName, PolyTypeName>;
                      })
                | computePolyElShape<PolyEls, PolyTypeName>
            : never
        : never);

type computePolyElShape<PolyEls, PolyTypeName> = typeutil.flatten<
  PolyTypeName extends string
    ? { __typename: PolyTypeName } & {
        [k in keyof PolyEls as PolyEls[k] extends $expr_PolyShapeElement
          ? PolyTypeName extends PolyEls[k]["__polyType__"]["__element__"]["__polyTypenames__"]
            ? k
            : never
          : never]: PolyEls[k] extends $expr_PolyShapeElement<
          infer PolyType,
          infer ShapeEl
        >
          ? [k] extends [keyof PolyType["__element__"]["__pointers__"]]
            ? shapeElementToTs<
                PolyType["__element__"]["__pointers__"][k],
                ShapeEl,
                k extends "__type__" ? PolyTypeName : null
              >
            : never
          : never;
      }
    : never
>;

type getPolyElTypes<El> = El extends $expr_PolyShapeElement
  ? El["__polyType__"]["__element__"]["__polyTypenames__"]
  : never;

export type PrimitiveType =
  | ScalarType
  | EnumType
  | TupleType
  | NamedTupleType
  | ArrayType
  | RangeType
  | MultiRangeType;

export type PrimitiveTypeSet = TypeSet<PrimitiveType, Cardinality>;

/////////////////////////
/// ARRAYTYPE
/////////////////////////

type $arrayLikeIndexify<Set extends TypeSet> = Set["__element__"] extends
  | ArrayType
  | ScalarType<"std::str">
  | ScalarType<"std::bytes">
  ? {
      [index: number]: $expr_Operator<
        // "[]",
        // OperatorKind.Infix,
        // [Set, TypeSet],
        // TypeSet<
        getPrimitiveBaseType<
          Set["__element__"] extends ArrayType<infer El>
            ? El
            : Set["__element__"]
        >,
        Set["__cardinality__"]
        // >
      >;
      [slice: `${number}:${number | ""}` | `:${number}`]: $expr_Operator<
        // "[]",
        // OperatorKind.Infix,
        // [Set, TypeSet],
        // TypeSet<
        getPrimitiveBaseType<Set["__element__"]>,
        Set["__cardinality__"]
        // >
      >;
      index<T extends TypeSet<ScalarType<"std::number">> | number>(
        index: T,
      ): $expr_Operator<
        // "[]",
        // OperatorKind.Infix,
        // [Set, TypeSet],
        // TypeSet<
        getPrimitiveBaseType<
          Set["__element__"] extends ArrayType<infer El>
            ? El
            : Set["__element__"]
        >,
        cardutil.multiplyCardinalities<
          Set["__cardinality__"],
          T extends TypeSet ? T["__cardinality__"] : Cardinality.One
        >
        // >
      >;
      slice<
        S extends TypeSet<ScalarType<"std::number">> | number,
        E extends
          | TypeSet<ScalarType<"std::number">>
          | number
          | undefined
          | null,
      >(
        start: S,
        end: E,
      ): $expr_Operator<
        // "[]",
        // OperatorKind.Infix,
        // [Set, TypeSet],
        // TypeSet<
        getPrimitiveBaseType<Set["__element__"]>,
        cardutil.multiplyCardinalities<
          cardutil.multiplyCardinalities<
            Set["__cardinality__"],
            S extends TypeSet ? S["__cardinality__"] : Cardinality.One
          >,
          E extends TypeSet<any, infer C> ? C : Cardinality.One
        >
        // >
      >;
      slice<
        E extends
          | TypeSet<ScalarType<"std::number">>
          | number
          | undefined
          | null,
      >(
        start: undefined | null,
        end: E,
      ): $expr_Operator<
        // "[]",
        // OperatorKind.Infix,
        // [Set, TypeSet],
        // TypeSet<
        getPrimitiveBaseType<Set["__element__"]>,
        cardutil.multiplyCardinalities<
          Set["__cardinality__"],
          E extends TypeSet<any, infer C> ? C : Cardinality.One
        >
        // >
      >;
    }
  : unknown;
export type $expr_Array<
  Type extends ArrayType = ArrayType,
  Card extends Cardinality = Cardinality,
  // Items extends typeutil.tupleOf<TypeSet<Type>>
> = Expression<{
  __kind__: ExpressionKind.Array;
  __items__: typeutil.tupleOf<TypeSet<Type["__element__"]>>;
  __element__: Type;
  __cardinality__: Card;
}>;

export interface ArrayType<
  Element extends BaseType = BaseType,
  Name extends string = `array<${Element["__name__"]}>`,
> extends BaseType {
  __name__: Name;
  __kind__: TypeKind.array;
  __element__: Element;
}

interface BaseArrayType extends BaseType {
  __name__: string;
  __kind__: TypeKind.array;
  __element__: BaseType;
}

/////////////////////////
/// TUPLE TYPE
/////////////////////////

type $tuplePathify<Set extends TypeSet> = Set["__element__"] extends TupleType
  ? addTuplePaths<Set["__element__"]["__items__"], Set["__cardinality__"]>
  : Set["__element__"] extends NamedTupleType
    ? addNamedTuplePaths<
        Set["__element__"]["__shape__"],
        Set["__cardinality__"]
      >
    : unknown;

export type $expr_TuplePath<
  ItemType extends BaseType = BaseType,
  ParentCard extends Cardinality = Cardinality,
> = Expression<{
  __kind__: ExpressionKind.TuplePath;
  __element__: ItemType;
  __cardinality__: ParentCard;
  __parent__: $expr_Tuple | $expr_NamedTuple | $expr_TuplePath;
  __index__: string | number;
}>;

export type baseTupleElementsToTupleType<T extends typeutil.tupleOf<TypeSet>> =
  {
    [k in keyof T]: T[k] extends TypeSet
      ? getPrimitiveBaseType<T[k]["__element__"]>
      : never;
  };
export type tupleElementsToTupleType<T extends typeutil.tupleOf<TypeSet>> =
  baseTupleElementsToTupleType<T> extends BaseTypeTuple
    ? TupleType<baseTupleElementsToTupleType<T>>
    : never;

export type baseTupleElementsToCardTuple<T> = {
  [k in keyof T]: T[k] extends TypeSet<any, infer C> ? C : never;
};

export type tupleElementsToCardTuple<T> =
  baseTupleElementsToCardTuple<T> extends [Cardinality, ...Cardinality[]]
    ? baseTupleElementsToCardTuple<T>
    : never;

export type $expr_Tuple<
  Items extends typeutil.tupleOf<TypeSet> = typeutil.tupleOf<TypeSet>,
> = Expression<{
  __kind__: ExpressionKind.Tuple;
  __items__: typeutil.tupleOf<TypeSet>;
  __element__: tupleElementsToTupleType<Items>;
  __cardinality__: cardutil.multiplyCardinalitiesVariadic<
    tupleElementsToCardTuple<Items>
  >;
}>;

export type indexKeys<T> = T extends `${number}` ? T : never;

type addTuplePaths<Items extends BaseType[], ParentCard extends Cardinality> = {
  [k in indexKeys<keyof Items>]: Items[k] extends BaseType
    ? $expr_TuplePath<Items[k], ParentCard>
    : never;
};

export interface TupleType<Items extends BaseTypeTuple = BaseTypeTuple>
  extends BaseType {
  __name__: string;
  __kind__: TypeKind.tuple;
  __items__: Items;
}

type TupleItemsToTsType<
  Items extends BaseTypeTuple,
  isParam extends boolean = false,
> = {
  [k in keyof Items]: BaseTypeToTsType<Items[k], isParam>;
};

/////////////////////////
/// NAMED TUPLE TYPE
/////////////////////////
type literalShapeToType<T extends NamedTupleLiteralShape> = NamedTupleType<{
  [k in keyof T]: getPrimitiveBaseType<T[k]["__element__"]>;
}>;
type shapeCardinalities<Shape extends NamedTupleLiteralShape> =
  Shape[keyof Shape]["__cardinality__"];
type inferNamedTupleCardinality<Shape extends NamedTupleLiteralShape> = [
  Cardinality.Many,
] extends [shapeCardinalities<Shape>]
  ? Cardinality.Many
  : [Cardinality.Empty] extends [shapeCardinalities<Shape>]
    ? Cardinality.Empty
    : [shapeCardinalities<Shape>] extends [Cardinality.AtMostOne]
      ? Cardinality.AtMostOne
      : [shapeCardinalities<Shape>] extends [
            Cardinality.AtMostOne | Cardinality.One,
          ]
        ? Cardinality.One
        : Cardinality.Many;

export type $expr_NamedTuple<
  Shape extends NamedTupleLiteralShape = NamedTupleLiteralShape,
> = Expression<{
  __kind__: ExpressionKind.NamedTuple;
  __element__: literalShapeToType<Shape>;
  __cardinality__: inferNamedTupleCardinality<Shape>;
  __shape__: Shape;
}>;

type addNamedTuplePaths<
  Shape extends NamedTupleShape,
  ParentCard extends Cardinality,
> = {
  [k in keyof Shape]: Shape[k] extends BaseType
    ? $expr_TuplePath<Shape[k], ParentCard>
    : never;
};

export type NamedTupleLiteralShape = { [k: string]: TypeSet };
export type NamedTupleShape = { [k: string]: BaseType };
export interface NamedTupleType<Shape extends NamedTupleShape = NamedTupleShape>
  extends BaseType {
  __name__: string;
  __kind__: TypeKind.namedtuple;
  __shape__: Shape;
}

type NamedTupleTypeToTsType<
  Type extends NamedTupleType,
  isParam extends boolean = false,
  Shape extends NamedTupleShape = Type["__shape__"],
> = typeutil.flatten<{
  [k in keyof Shape]: BaseTypeToTsType<Shape[k], isParam>;
}>;

/////////////////////////
/// RANGE TYPE
/////////////////////////

export interface RangeType<
  Element extends ScalarType = ScalarType,
  Name extends string = `range<${Element["__name__"]}>`,
> extends BaseType {
  __name__: Name;
  __kind__: TypeKind.range;
  __element__: Element;
}

/////////////////////////
/// MULTIRANGE TYPE
/////////////////////////

export interface MultiRangeType<
  Element extends ScalarType = ScalarType,
  Name extends string = `multirange<${Element["__name__"]}>`,
> extends BaseType {
  __name__: Name;
  __kind__: TypeKind.multirange;
  __element__: Element;
}

/////////////////////
/// TSTYPE COMPUTATION
/////////////////////
export type orLiteralValue<Set extends TypeSet> =
  | Set
  | (Set["__element__"] extends ObjectType
      ? never
      : computeTsType<Set["__element__"], Set["__cardinality__"]>);

type ScalarTypeToTsType<
  T extends ScalarType,
  isParam extends boolean,
> = isParam extends true ? T["__tsargtype__"] : T["__tsconsttype__"];

type ArrayTypeToTsType<
  Type extends BaseArrayType,
  isParam extends boolean,
> = isParam extends true
  ? readonly BaseTypeToTsType<Type["__element__"], isParam>[]
  : BaseTypeToTsType<Type["__element__"], isParam>[];

export type BaseTypeToTsType<
  Type extends BaseType,
  isParam extends boolean = false,
> = BaseType extends Type
  ? unknown
  : Type extends ScalarType
    ? ScalarTypeToTsType<Type, isParam>
    : Type extends EnumType
      ? Type["__tstype__"]
      : Type extends BaseArrayType
        ? ArrayTypeToTsType<Type, isParam>
        : Type extends RangeType
          ? Range<Type["__element__"]["__tsconsttype__"]>
          : Type extends MultiRangeType
            ? MultiRange<Type["__element__"]["__tsconsttype__"]>
            : Type extends TupleType
              ? TupleItemsToTsType<Type["__items__"], isParam>
              : Type extends NamedTupleType
                ? NamedTupleTypeToTsType<Type, isParam>
                : Type extends ObjectType
                  ? computeObjectShape<
                      Type["__pointers__"],
                      Type["__shape__"],
                      Type["__polyTypenames__"]
                    >
                  : never;

export type setToTsType<Set> =
  Set extends $Shape<infer Element, infer Shape, infer Card>
    ? Shape extends object
      ? computeTsTypeCard<
          computeObjectShape<Element["__pointers__"], normaliseShape<Shape>>,
          Card
        >
      : never
    : Set extends TypeSet
      ? computeTsType<Set["__element__"], Set["__cardinality__"]>
      : never;

export type computeTsTypeCard<T, C extends Cardinality> = Cardinality extends C
  ? unknown
  : C extends Cardinality.Empty
    ? null
    : C extends Cardinality.One
      ? T
      : C extends Cardinality.AtLeastOne
        ? [T, ...T[]]
        : C extends Cardinality.AtMostOne
          ? T | null
          : C extends Cardinality.Many
            ? T[]
            : C extends Cardinality
              ? unknown
              : never;

export type computeTsType<
  T extends BaseType,
  C extends Cardinality,
> = BaseType extends T ? unknown : computeTsTypeCard<BaseTypeToTsType<T>, C>;

export type pointerToTsType<
  El extends PropertyDesc | LinkDesc,
  T extends BaseType = El["target"],
  C extends Cardinality = El["cardinality"],
> = computeTsType<T, C>;

///////////////////
// TYPE HELPERS
///////////////////

export type getPrimitiveBaseType<T extends BaseType> = T extends ScalarType
  ? ScalarType<T["__name__"], T["__tstype__"], T["__tsargtype__"]>
  : T;

export type getPrimitiveNonArrayBaseType<T extends BaseType> =
  T extends ArrayType ? never : getPrimitiveBaseType<T>;

export function isScalarType(type: BaseType): type is ScalarType {
  return type.__kind__ === TypeKind.scalar;
}
export function isEnumType(type: BaseType): type is EnumType {
  return type.__kind__ === TypeKind.enum;
}
export function isObjectType(type: BaseType): type is ObjectType {
  return type.__kind__ === TypeKind.object;
}
export function isTupleType(type: BaseType): type is TupleType {
  return type.__kind__ === TypeKind.tuple;
}
export function isNamedTupleType(type: BaseType): type is NamedTupleType {
  return type.__kind__ === TypeKind.namedtuple;
}
export function isArrayType(type: BaseType): type is ArrayType {
  return type.__kind__ === TypeKind.array;
}

export type NonArrayType =
  | ScalarType
  | EnumType
  | ObjectType
  | TupleType
  | NamedTupleType
  | RangeType
  | MultiRangeType;

export type AnyTupleType = TupleType | NamedTupleType;

export type AnyObjectType = ObjectType;

export type ParamType =
  | ScalarType
  | EnumType
  | ArrayType<
      | ScalarType
      | TupleType<typeutil.tupleOf<ParamType>>
      | NamedTupleType<{ [k: string]: ParamType }>
      | RangeType
      | MultiRangeType
    >
  | TupleType<typeutil.tupleOf<ParamType>>
  | NamedTupleType<{ [k: string]: ParamType }>
  | RangeType
  | MultiRangeType;
