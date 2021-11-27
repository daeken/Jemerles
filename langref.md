Variable Declarations
=====================

```
def foo = 'foo'; // Immutable declaration and definition of `foo` as a string 'foo'
mutable bar: number; // Immutable declaration of `bar` as a number with no beginning value
def foo = 5; // Immutable *redeclaration* of `foo` as the number 5
mutable bar: string; // ERROR! Cannot redeclare mutable variables, regardless of type
```

Type System
===========

The type system is based upon that of TypeScript. Key differences:

- Generics take the form `base[generic]` rather than `base<generic>`
- Tuple types take the form `type1 * type2 * type3` rather than `[type1, type2, type3]`
- Function types take the form `argtype1 * argtype2 -> rettype` rather than `(someName: argtype1, someOtherName: argtype2) => rettype`. Note the lack of parameter names

Functions
=========

Local functions
---------------

These capture local scope and may be fully or partially type inferred.

```
def add(a, b) { a + b }
def add(a, b) => a + b;
def add = (a, b) => a + b;

def addFive(x) { x + 5 }
def addFive(x) => x + 5;
def addFive = x => x + 5;
def addFive = x => { x + 5 }; // Note the trailing semicolon!
def addFive = _ + 5;
def addFive = add(_, 5);

def addFive(x : number) : number => x + 5;
def addFive(x) : number => x + 5;
def addFive(x : number) => x + 5;
```

Exported functions
------------------

An exported function is similar in that it captures local scope, but argument and return types must be made explicit.

```
export add(a : number, b : number) => a + b;
```

Match-body functions
--------------------

The inner body of a function can be made up of match clauses, which act on the arguments (as a plain value for a single argument or a tuple for 2+).

```
def fibonacci(n, acc = 1) {
	| (0, _) | (1, _) => acc
	| _ => fibonacci(n - 1, n * acc)
}
```

Recursion
=========

Tail calls to the same function are handled without increasing stack depth (that is, their tail calls are optimized away), but this is not true of tail calls to other functions. Therefore, direct mutual recursion is likely to explode the stack.

Array Literals
==============

```
array[] // Empty array; has type any[] unless otherwise inferred
array[1] // Array containing a single value; has type number[]
array[1, "foo", true] // Array containing three values of three different types; has type any[] (TODO: should this be (number|string|boolean)[] ?)
```

Tuple Literals
==============

Tuples are arrays under the hood, but cannot be indexed, are immutable, and must contain 2 or more elements.

```
('foo', 'bar')
('foo', 5)
('foo', 12, ('bar', 'hax'))
```

Object Literals
===============

String Literals
===============

Basics
------
```
'foo'
'bar'
'foo\nbar'
'foo
bar'

"foo"
"bar"
"foo\nbar"
"foo
bar"
```

Formatting
----------

```
$'foo {'bar'}'
$'foo {bar}'
$"foo {'bar'}"
$"foo {bar}"
```

TODO: Figure out number formatting options

Regex Literals
==============

```
/foo/
/foo(bar)?/
/foo/ig
```

Number Literals
===============

Decimal
-------

```
123
0123
12_3 12__3
123.0 123.
0.123
-12.3
1_000_000.000_000_001
```

Binary
------

```
0b0101
0b01_01
-0b01_01
```

Octal
-----

```
0o123
0o12_3
-0o123
```

Hexadecimal
-----------

```
0x123
0x12_3
-0x12_3
0xabcdef
0xABCDEF
```

Boolean Literals
================

```
true
false
```

Special Literals
================

```
null
undefined
```

These both are of type `any` by default, but are generally used in a way that makes them take a more specific type.

```
def foo() : string { null } // This `null` is a string
```

Code Literals
=============

These code quotations are generally used in macros, as they allow you to get the AST of a given snippet of code directly.

```
<[ some(code, goes(here)) ]>
<[
def foo(foob) { foob + 1 }
def bar(barb) { barb(barb(1)) }
]>
```

Classes
=======

Visibility/Access
-----------------

Constructors
------------

Methods
-------

Fields
------

Properties
----------

Indexers
--------

Indexer Properties
------------------

Interfaces
==========

Macros
======

Pattern Matching
================

Note: Everything here (aside from `match()` syntax itself) applies to match-body functions/methods/properties.

```
match(foo) {
	| 'bar' => 5 // A single pattern
	| 'baz' | 'hax' => 6 // Multiple patterns in an OR configuration
	| _ when(foo < 5) => 3 // Conditional
	| _ => 5 // Match anything
}
```

Tuple Patterns
--------------

```
('foo', bar) // Binds second tuple element to `bar`
('foo', _) // Ignores second tuple element
```

Array Patterns
--------------

```
[] // Empty array
[5] // Array with one element being 5
[_, 5] // Array with two elements, second being 5
[_, 5] :: _ // Array with 2+ elements and the second element is 5
5 :: _ // Array with one or more elements, first being 5
bar :: _ // Array with one or more elements, binding first to `bar`
_ :: bar :: _ // Array with two or more elements, binding second to `bar`
first :: rest // Array with one or more elements, binding the first to `first` and the rest to `rest`
```

String Patterns
---------------

TODO: Figure out regex matching for strings

Object Patterns
---------------

Type Patterns
-------------

Blocks
======

Imports/Exports
===============

Null Chaining
=============
