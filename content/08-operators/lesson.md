## Making types feel built in

A money amount stored as `int` cents is easy to misuse: `a.cents + b.cents` compiles, and so does adding cents to a length. A `Money` type fixes that, but `Money::add(a, b)` reads worse than `a + b`. **Operator overloading** (C++) and **special "dunder" methods** (Python) let your types use the language's own syntax.

> **Pitfall:** Overload an operator only when its meaning is obvious. `+` on `Money` is clear; `+` on `User` is not. If a reader has to look up what `a * b` does, use a named function.

## Member vs non-member, and symmetry

~~~cpp
struct Vec {
    double x, y;
    Vec operator*(double k) const { return {x * k, y * k}; }  // v * 2 works
};
Vec operator*(double k, const Vec& v) { return v * k; }       // 2 * v needs a free function
~~~
~~~python
class Vec:
    def __init__(self, x, y): self.x, self.y = x, y
    def __mul__(self, k):  return Vec(self.x * k, self.y * k)  # v * 2
    def __rmul__(self, k): return self * k                     # 2 * v
~~~

In C++ `a @ b` calls `a.operator@(b)` or `operator@(a, b)`. A member only takes the **left** operand as `this`, so `2 * v` cannot find a member of `int`. Python solves symmetry differently: if `int.__mul__(2, v)` returns `NotImplemented`, Python tries the right operand's `__rmul__`.

## `+` built on `+=`

~~~cpp
class Money {
    long long cents_;
public:
    explicit Money(long long c = 0) : cents_(c) {}
    Money& operator+=(const Money& o) { cents_ += o.cents_; return *this; }
    friend Money operator+(Money a, const Money& b) { a += b; return a; }  // a is a copy
};
~~~
~~~python
class Money:
    def __init__(self, cents): self.cents = cents
    def __iadd__(self, o):          # in place: mutates and returns self
        self.cents += o.cents
        return self
    def __add__(self, o):           # new object: never mutate self
        return Money(self.cents + o.cents)
~~~

Write the mutating `+=` once, then make `+` a copy plus `+=`. Taking the left operand **by value** is the copy. `+` must never modify its operands.

## Comparison: `==` and `<=>`

~~~cpp
#include <compare>
struct Version {
    int major, minor;
    auto operator<=>(const Version&) const = default;  // also declares ==
    bool operator==(const Version&) const = default;
};
// Version{1,2} < Version{1,10} works; std::sort works too
~~~
~~~python
from functools import total_ordering

@total_ordering
class Version:
    def __init__(self, major, minor): self.t = (major, minor)
    def __eq__(self, o):
        if not isinstance(o, Version): return NotImplemented
        return self.t == o.t
    def __lt__(self, o):
        if not isinstance(o, Version): return NotImplemented
        return self.t < o.t          # total_ordering derives <=, >, >=
~~~

A defaulted `<=>` compares members in declaration order and gives you `<`, `<=`, `>` and `>=`. Declare `==` as defaulted too (a defaulted `<=>` implies a defaulted `==`, but being explicit is clear). Python's `total_ordering` fills in the other comparisons from `__eq__` plus one ordering method.

## Printing: `operator<<` and `__repr__`

~~~cpp
std::ostream& operator<<(std::ostream& os, const Money& m) {
    return os << '$' << m.dollars() << '.' << m.centsPart();
}
~~~
~~~python
class Money:
    def __repr__(self): return f"Money({self.cents})"   # for developers
    def __str__(self):  return f"${self.cents / 100:.2f}"  # for users
    def __format__(self, spec): return format(self.cents / 100, spec)
~~~

`operator<<` must be a **non-member**: the stream is the left operand, and you cannot add members to `std::ostream`. Return the stream so calls chain. In Python, `__str__` falls back to `__repr__`, so write `__repr__` first.

## Indexing, calling, increment

~~~cpp
class Grid {
    std::vector<int> d_; int w_;
public:
    Grid(int w, int h) : d_(w * h), w_(w) {}
    int&       operator()(int r, int c)       { return d_[r * w_ + c]; }
    const int& operator()(int r, int c) const { return d_[r * w_ + c]; }
};
struct Counter {
    int n = 0;
    Counter& operator++()   { ++n; return *this; }          // ++c
    Counter  operator++(int) { Counter old = *this; ++n; return old; }  // c++ (dummy int)
};
struct Adder { int k; int operator()(int x) const { return x + k; } };  // functor
~~~
~~~python
class Grid:
    def __init__(self, w, h): self.w, self.d = w, [0] * (w * h)
    def __getitem__(self, rc):
        r, c = rc
        return self.d[r * self.w + c]
    def __setitem__(self, rc, v):
        r, c = rc
        self.d[r * self.w + c] = v

class Adder:
    def __init__(self, k): self.k = k
    def __call__(self, x): return x + self.k   # Adder(3)(4) == 7
~~~

Provide both a `const` and a non-`const` subscript or call operator: the first returns a reference you can write through, the second lets `const Grid&` be read. Pre-increment returns the new value by reference; post-increment takes a dummy `int`, copies the old value and returns it by value, so it is more expensive.

## Python container protocol and truthiness

~~~cpp
// C++ containers expose begin()/end() so range-for and algorithms work.
class Bag {
    std::vector<int> v_;
public:
    auto begin() const { return v_.begin(); }
    auto end()   const { return v_.end(); }
    std::size_t size() const { return v_.size(); }
};
~~~
~~~python
class Bag:
    def __init__(self, *items): self._v = list(items)
    def __len__(self): return len(self._v)
    def __getitem__(self, i): return self._v[i]   # alone enables iteration and `in`
    def __contains__(self, x): return x in self._v
    def __iter__(self): return iter(self._v)
    def __bool__(self): return bool(self._v)      # without it, __len__ decides
~~~

`bool(obj)` calls `__bool__`, then `__len__`; an object with `__len__() == 0` is falsy. If only `__getitem__` exists, Python still iterates by calling it with 0, 1, 2... until `IndexError`, and `in` works the same way.

## Equality and hashing

~~~cpp
// std::unordered_set needs a hash and ==; they must agree
struct P { int x, y; bool operator==(const P&) const = default; };
struct PHash { std::size_t operator()(const P& p) const { return std::hash<int>()(p.x) * 31 + std::hash<int>()(p.y); } };
~~~
~~~python
class P:
    def __init__(self, x, y): self.x, self.y = x, y
    def __eq__(self, o):
        return (self.x, self.y) == (o.x, o.y) if isinstance(o, P) else NotImplemented
    def __hash__(self): return hash((self.x, self.y))
~~~

If equal objects have different hashes, sets and dictionaries break. Defining `__eq__` without `__hash__` makes a Python class **unhashable** (`__hash__` is set to `None`). Only hash immutable state, or the hash changes while the object sits in a set.

> **C++ vs Python:** Returning `NotImplemented` (not `False`) from `__eq__` and `__add__` lets Python try the other operand. Returning `False` ends the conversation and can break symmetry.

## Key takeaways

- Overload an operator only when its meaning is unsurprising; otherwise name a function.
- C++: use a free function (often `friend`) for symmetric operators such as `2 * v` and for `operator<<`.
- Implement `+=` as the primitive and build `+` from a copy plus `+=`.
- A defaulted `operator<=>` gives all ordering operators; pair it with a defaulted `==`.
- Pre-increment returns a reference; post-increment takes a dummy `int` and returns the old value.
- Python binary operators return `NotImplemented` for foreign types so `__radd__` and `__rmul__` get their turn.
- Define `__hash__` consistently with `__eq__`, and only for immutable state.
- `__len__`, `__getitem__`, `__iter__`, `__contains__` and `__bool__` give a class the container protocol.

## Common pitfalls

- Overloading `&&` or `||` in C++: the overloaded versions lose short-circuit evaluation.
- Defining `__eq__` and forgetting `__hash__`, or hashing mutable fields.
- Mutating `self` inside `__add__` or `operator+`, so `c = a + b` silently changes `a`.
- Making `operator*` a member and then wondering why `2 * v` does not compile.
- Returning `False` instead of `NotImplemented` for an unsupported operand type.
- Making `operator<<` a member of your class, which puts the stream on the right.
