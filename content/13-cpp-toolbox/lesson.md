## Why a toolbox?

A class is a promise to its callers: what it exposes, what it never changes, and what conversions it allows. C++ lets you state these promises in the type system, so the compiler enforces them. A `Temperature` that silently converts from any `int`, or a getter that quietly mutates state, breaks callers in ways no test may catch. This module covers the small tools that make a class *honest*. Each section ends with how Python gets the same effect (usually by convention or protocol).

## Const-correctness

A `const` member function promises not to modify the object's observable state. Only const members can be called through a `const` object or reference.

~~~cpp
class Counter {
    int n_ = 0;
public:
    int get() const { return n_; }      // promise: no change
    void inc() { ++n_; }
    int& ref() { return n_; }           // non-const: may hand out write access
    const int& ref() const { return n_; } // const overload: read-only access
};

void show(const Counter& c) {
    c.get();     // ok
    // c.inc();  // error: passing 'const Counter' discards qualifiers
}
~~~
~~~python
class Counter:
    def __init__(self):
        self._n = 0

    @property
    def n(self):          # read-only by convention: no setter
        return self._n

    def inc(self):
        self._n += 1

c = Counter()
# c.n = 5  -> AttributeError: property has no setter
~~~

Overload resolution picks the const overload when the object is const and the non-const one otherwise. Python has no `const`; you signal intent with properties, naming and immutable types.

## `mutable`: logical vs bitwise constness

*Bitwise* constness means no byte changes. *Logical* constness means the caller cannot observe a change. A cache or a call counter changes bytes but not the visible value, so mark it `mutable`.

~~~cpp
#include <optional>
class Circle {
    double r_;
    mutable std::optional<double> area_;   // cache
    mutable int computes_ = 0;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const {
        if (!area_) { area_ = 3.14159 * r_ * r_; ++computes_; }
        return *area_;
    }
};
~~~
~~~python
from functools import cached_property

class Circle:
    def __init__(self, r):
        self.r = r

    @cached_property
    def area(self):            # computed once, stored in the instance __dict__
        return 3.14159 * self.r ** 2
~~~

> **Note:** For a `std::mutex` member locked inside a const method, `mutable` is the standard tool. `mutable` is not a license to hide real mutations: the const interface must still look unchanged.

## `constexpr` and `consteval`

A `constexpr` constructor and members let objects be built and used at compile time. A `consteval` function *must* be evaluated at compile time.

~~~cpp
struct Point {
    int x, y;
    constexpr Point(int x, int y) : x(x), y(y) {}
    constexpr int sum() const { return x + y; }
};
constexpr Point p{3, 4};
static_assert(p.sum() == 7);
consteval int square(int v) { return v * v; }
constexpr int nine = square(3);
~~~
~~~python
# No compile time. The closest tools are immutability and caching.
from typing import NamedTuple

class Point(NamedTuple):
    x: int
    y: int

p = Point(3, 4)
~~~

## Nested classes and iterators

A nested class lives in the outer class's scope and, being a member, can access the outer class's private names (through an object). The classic use is an iterator.

~~~cpp
class IntList {
    int data_[3] = {1, 2, 3};
public:
    class Iterator {
        const int* p_;
    public:
        explicit Iterator(const int* p) : p_(p) {}
        int operator*() const { return *p_; }
        Iterator& operator++() { ++p_; return *this; }
        bool operator!=(const Iterator& o) const { return p_ != o.p_; }
    };
    Iterator begin() const { return Iterator(data_); }
    Iterator end() const { return Iterator(data_ + 3); }
};
// for (int v : IntList{}) ...
~~~
~~~python
class IntList:
    def __init__(self):
        self._data = [1, 2, 3]

    def __iter__(self):            # a generator replaces the nested class
        yield from self._data
~~~

## Conversions: `explicit` and conversion operators

A constructor callable with one argument is a *converting constructor*: it enables implicit conversion. Mark it `explicit` unless the conversion is truly natural.

~~~cpp
struct Meters {
    double v;
    Meters(double d) : v(d) {}             // implicit: Meters m = 5.0; compiles
};
struct Seconds {
    double v;
    explicit Seconds(double d) : v(d) {}
};
// Seconds s = 5.0;   // error: copy-initialization needs a non-explicit ctor
Seconds s{5.0};        // ok: direct initialization

class Handle {
    int fd_ = -1;
public:
    explicit operator bool() const { return fd_ >= 0; }  // usable in if, not in arithmetic
};
~~~
~~~python
class Handle:
    def __init__(self, fd=-1):
        self.fd = fd

    def __bool__(self):      # truthiness
        return self.fd >= 0

class Index:
    def __index__(self):     # allows use as a list index, like an integer
        return 2

[10, 20, 30][Index()]        # 30
~~~

> **C++ vs Python:** `explicit operator bool` still works in `if`, `while` and `!`, but blocks `int x = handle;`. Python's `__bool__` is always usable by `if`; `__int__` and `__index__` cover conversion to numbers.

## Friends and the hidden friend

`friend` grants a function or class access to private members. A friend defined inside the class body is a *hidden friend*: found only by argument-dependent lookup, so it adds no clutter to the namespace.

~~~cpp
class Money {
    long cents_;
public:
    explicit Money(long c) : cents_(c) {}
    friend bool operator==(const Money& a, const Money& b) { return a.cents_ == b.cents_; }
    friend std::ostream& operator<<(std::ostream& os, const Money& m) { return os << m.cents_; }
};
~~~
~~~python
class Money:
    def __init__(self, cents):
        self._cents = cents

    def __eq__(self, other):
        return isinstance(other, Money) and self._cents == other._cents
~~~

## `= delete` and `[[nodiscard]]`

`= delete` makes a call ill-formed, useful to block silent narrowing. `[[nodiscard]]` warns when a result is ignored.

~~~cpp
class Gauge {
    int level_ = 0;
public:
    void set(int v) { level_ = v; }
    void set(double) = delete;           // g.set(2.5) no longer compiles
    [[nodiscard]] int level() const { return level_; }
    [[nodiscard]] static Gauge make() { return Gauge{}; }
};
~~~
~~~python
from types import MappingProxyType

_config = {"debug": False}
view = MappingProxyType(_config)    # read-only window onto the dict
# view["debug"] = True  -> TypeError
~~~

> **Under the hood:** Without `= delete`, `set(2.5)` would silently pick `set(int)` and truncate. Deleted functions still take part in overload resolution, which is why they win and then fail.

## Key takeaways

- A `const` member function promises not to change observable state and is the only kind callable on a const object.
- Provide both const and non-const overloads when handing out references.
- `mutable` is for logical constness: caches, counters and mutexes.
- `constexpr` enables compile-time construction; `consteval` forces it.
- Mark single-argument constructors and `operator bool` `explicit` by default.
- A hidden friend defined in-class is found only through argument-dependent lookup.
- `= delete` rejects overloads; `[[nodiscard]]` flags ignored results.
- Python counterparts: `__bool__`, `__index__`, `property`, `MappingProxyType`, `cached_property`.

## Common pitfalls

- Forgetting `const` on getters, so they cannot be used on const references.
- Using `mutable` to hide genuine state changes, breaking thread-safety expectations.
- Leaving converting constructors implicit and getting surprise conversions in overloads.
- Writing a non-explicit `operator bool`, which lets objects join arithmetic (`h + 1`).
- Assuming `cached_property` refreshes: it computes once per instance until you delete the attribute.
- Expecting `MappingProxyType` to freeze the underlying dict: the owner can still change it, and the view reflects that.
