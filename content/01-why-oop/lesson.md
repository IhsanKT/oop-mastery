## Why objects? A bank in parallel arrays

Here is a small bank's program, written procedurally: each account is spread across parallel arrays, and free functions update them by index.

~~~cpp
std::vector<std::string> owners   = {"Ada", "Grace", "Linus"};
std::vector<double>      balances = {100.0, 50.0, 75.0};  // balances[i] is owners[i]'s

bool withdraw(std::size_t i, double amount) {
    if (amount <= 0 || amount > balances[i]) return false;  // rule: never negative
    balances[i] -= amount;
    return true;
}
void chargeFee(std::size_t i) { balances[i] -= 5.0; }  // forgot the rule
~~~
~~~python
owners = ["Ada", "Grace", "Linus"]
balances = [100.0, 50.0, 75.0]   # balances[i] is owners[i]'s

def withdraw(i, amount):
    if amount <= 0 or amount > balances[i]:   # rule: never negative
        return False
    balances[i] -= amount
    return True

def charge_fee(i):
    balances[i] -= 5.0           # forgot the rule
~~~

It works, until the program grows:

- **Scattered invariants.** The rule *a balance never goes negative* belongs to no one. Every function that touches `balances` must re-check it; `chargeFee` forgets, and the bug surfaces weeks later, far from its cause.
- **Data separated from behavior.** Any line in the program may write `balances[i]`, so proving that the rule holds means reading *everything*.
- **Fragile coupling.** `owners[i]` and `balances[i]` match only by convention: a `closeAccount(0)` that erases the owner but not the balance leaves Grace holding Ada's 100. A dict keyed by name fixes the indexing, not the ownership.

Object-oriented programming puts the data and the only code allowed to change it **in one unit**, and enforces the rule there:

~~~cpp
class Account {
public:
    explicit Account(std::string owner) : owner_(std::move(owner)) {}

    bool withdraw(double amount) {         // the rule lives here, once
        if (amount <= 0 || amount > balance_) return false;
        balance_ -= amount;
        return true;
    }
    bool deposit(double amount);           // similar: rejects amount <= 0
    double balance() const { return balance_; }

private:
    std::string owner_;      // owner and balance travel together
    double balance_ = 0.0;   // only Account's own functions can change it
};

std::vector<Account> accounts;   // one container: nothing to keep in sync
~~~
~~~python
class Account:
    def __init__(self, owner):
        self.owner = owner
        self._balance = 0.0      # "internal": use the methods

    def withdraw(self, amount):  # the rule lives here, once
        if amount <= 0 or amount > self._balance:
            return False
        self._balance -= amount
        return True

    def deposit(self, amount): ...   # similar: rejects amount <= 0

    def balance(self):
        return self._balance
~~~

> **C++ vs Python:** C++ enforces `private` at compile time. Python has no access control: the underscore in `_balance` is a convention. Module 04 shows how Python still guards state with `@property`.

## Objects: state, behavior, identity

An **object** bundles three things:

- **State**: its current data (owner, balance). Every object has its own.
- **Behavior**: the operations it supports, which read and change *that object's* state.
- **Identity**: it is one particular thing. Two accounts with equal owner and balance are still two accounts.

~~~cpp
Account a("Ada"), b("Ada");   // equal state...
a.deposit(50);                // ...but two objects: only a changes
bool same = (&a == &b);       // false: different objects, different addresses
~~~
~~~python
a, b = Account("Ada"), Account("Ada")   # equal state...
a.deposit(50)                           # ...but two objects: only a changes
a is b                                  # False: different objects
~~~

## Classes and objects

A **class** is a blueprint: it declares the state every instance has and defines the behavior once. An **object** (an **instance**) is one concrete thing built from it, with its own state.

~~~cpp
class Point {                  // the class: a type, a blueprint
public:
    double x = 0, y = 0;       // state: every Point gets its own x and y
    void moveBy(double dx, double dy) { x += dx; y += dy; }   // behavior
};

Point p;          // an object: (0, 0)
Point q{3, 4};    // another object
p.moveBy(1, 2);   // only p changes
~~~
~~~python
class Point:                   # the class: a blueprint
    def __init__(self, x=0, y=0):
        self.x = x             # state: stored in each instance
        self.y = y

    def move_by(self, dx, dy): # behavior, defined once
        self.x += dx
        self.y += dy

p = Point()       # calling the class creates an object
q = Point(3, 4)
p.move_by(1, 2)   # only p changes
~~~

> **C++ vs Python:** A C++ class is a compile-time type. A Python `class` statement *runs* and creates a class object (`type(Point) is type`) you can pass around like any value. C++ `struct` and `class` differ only in default access.

> **Pitfall:** `Point p();` creates no `Point`: C++ reads it as a function declaration (GCC warns *empty parentheses were disambiguated as a function declaration*). Write `Point p;` or `Point p{};`.

## The four pillars

These four ideas carry most of OOP. Each gets its own module; here is the map.

**Encapsulation (Module 04)** bundles an object's data with the methods that operate on it and hides the data, so outside code can change it only through those methods. The object then enforces its own invariants in one place, and its internals can change without breaking callers. C++ enforces this with `private`; Python relies on the `_name` convention.

~~~cpp
Account acct("Ada");
acct.deposit(100);       // goes through the rule
// acct.balance_ = -1;   // error: 'double Account::balance_' is private within this context
~~~
~~~python
acct = Account("Ada")
acct.deposit(100)        # goes through the rule
acct._balance = -1       # runs! Python trusts you to respect the underscore
~~~

**Abstraction (Module 07)** means exposing *what* an object does and hiding *how*. Callers depend on a small interface (any `Shape` can report its `area()`), not on formulas or data layouts, so implementations can be swapped or improved freely. An abstract class makes such an interface explicit.

~~~cpp
class Shape {                          // what every shape can do, not how
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};
~~~
~~~python
from abc import ABC, abstractmethod

class Shape(ABC):                      # what every shape can do, not how
    @abstractmethod
    def area(self): ...
~~~

**Inheritance (Module 05)** defines a new class as a special case of an existing one: a `Circle` **is a** `Shape`. The derived class reuses the base's interface (and any shared code) and specializes what differs. Use it only for true is-a relationships; for "has a", put one object inside another (composition, Module 17).

~~~cpp
class Circle : public Shape {          // a Circle is-a Shape
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159 * r_ * r_; }
private:
    double r_;
};
~~~
~~~python
class Circle(Shape):                   # a Circle is-a Shape
    def __init__(self, r):
        self.r = r

    def area(self):
        return 3.14159 * self.r ** 2
~~~

**Polymorphism (Module 06)** means "one interface, many forms": the same call runs different code depending on the object's actual type. Code written once for `Shape` works for circles, squares and shapes written next year, with no `if`/`else` chain on the type. C++ needs `virtual` functions for this; Python method calls always dispatch on the object's class.

~~~cpp
double totalArea(const std::vector<const Shape*>& shapes) {
    double sum = 0;
    for (const Shape* s : shapes) sum += s->area();   // Circle::area, Square::area...
    return sum;
}
~~~
~~~python
def total_area(shapes):
    return sum(s.area() for s in shapes)   # each object answers in its own way
~~~

> **Note:** Abstraction is a *design* decision about the outside: which operations to offer. Encapsulation is the *mechanism* that guards the inside: the data stays private, reachable only through those operations.

## How objects live in memory

**C++ has value semantics.** A variable of class type holds the object itself; locals live in *automatic storage* (in practice, the stack). Copying is the default; a **reference** (`&`) is another name for an existing object, and `new` creates one in *dynamic storage* (the heap) that lives until `delete`.

**Python variables are names**: references to heap objects. Nothing is copied unless you ask (`copy.copy`, Module 10). A parameter is bound to the caller's object (*call by sharing*): mutating it is visible to the caller, rebinding it is not.

~~~cpp
struct Point { int x, y; };

void nudge(Point p)     { p.x += 1; }   // p is a copy
void nudgeRef(Point& p) { p.x += 1; }   // p is the caller's object

Point a{1, 2};       // a IS the Point
Point b = a;         // copy: a second, independent Point
b.x = 9;             // a.x is still 1
Point& r = a;        // no new object: r is another name for a
r.x = 5;             // a.x is now 5
nudge(a);            // a.x is still 5
nudgeRef(a);         // a.x is now 6

Point* h = new Point{3, 4};   // dynamic storage
Point* h2 = h;       // copies the address, not the Point
h2->x = 7;           // h->x is 7 too: one Point, two pointers
delete h;            // exactly once; h and h2 now dangle
~~~
~~~python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

def nudge(p):
    p.x += 1         # mutates the caller's object

a = Point(1, 2)      # a is a name for a Point on the heap
b = a                # no copy: b names the SAME object
b.x = 9              # a.x is 9 too
nudge(a)             # a.x is now 10
b = Point(0, 0)      # rebinding b does not affect a
~~~

| | C++ | Python |
|---|---|---|
| A variable holds | the object itself | a reference to an object |
| `b = a` | copies the object | binds another name, no copy |
| Passing an argument | copies, unless the parameter is a reference | shares the caller's object |

> **Under the hood:** A `std::vector<Point>` stores the `Point`s themselves, side by side. A Python list stores references: `[p, p]` holds one `Point` twice.

### Identity vs equality

*Identity* asks "are these the same object?"; *equality* asks "do they have the same value?".

~~~cpp
struct Point {
    int x, y;
    bool operator==(const Point&) const = default;   // C++20: compare members
};

Point a{1, 2}, b{1, 2};
a == b;     // true (without operator==, this would not compile)
&a == &b;   // false: two objects, two addresses
~~~
~~~python
a = [1, 2]
b = [1, 2]
c = a
a == b      # True: list.__eq__ compares the elements
a is b      # False: two list objects
id(a) == id(c)   # True: one object (in CPython, id() is its address)
Point(1, 2) == Point(1, 2)   # False! No __eq__ defined: == falls back to identity
~~~

> **Pitfall:** Use `is` only for identity, typically `x is None`. CPython caches some small integers and strings, so `is` may *seem* to compare values, until it doesn't.

### Lifetime: scope vs references

A C++ local (automatic) object is destroyed at the closing `}` of its scope; locals die in **reverse order of construction**. A Python object lives as long as something refers to it; CPython frees it when its reference count drops to zero.

~~~cpp
struct Noisy {
    const char* name;
    ~Noisy() { std::cout << "drop " << name << '\n'; }
};

int main() {
    Noisy a{"a"};
    {
        Noisy b{"b"};
    }               // drop b: its scope ended
    Noisy c{"c"};
}                   // drop c, then drop a
~~~
~~~python
class Noisy:
    def __del__(self):
        print("drop")

a = Noisy()
b = a        # a second reference
del a        # removes the NAME a; b still refers to the object
del b        # last reference gone: CPython prints "drop" now
~~~

> **C++ vs Python:** C++ destruction is deterministic, so C++ ties resources like files to object lifetime (RAII, Module 11). Python only promises that unreachable objects *may* be reclaimed: clean up with `with`, not `__del__`.

## Methods are messages: meet `this` and `self`

Read `acct.withdraw(30)` as *sending the message* "withdraw 30" to `acct`: the caller says *what* it wants; the object decides *how*, using its own state, and may refuse. Different objects may answer the same message differently: polymorphism.

A method is written once, so how does it know *which* object to change? Every call receives the object it was called on:

~~~cpp
bool Account::deposit(double amount) {
    if (amount <= 0) return false;
    this->balance_ += amount;     // what plain balance_ really means
    return true;
}

acct.deposit(50);   // inside deposit, this == &acct
~~~
~~~python
def deposit(self, amount):        # inside class Account
    if amount <= 0:
        return False
    self._balance += amount       # self is acct
    return True

acct.deposit(50)    # Python runs Account.deposit(acct, 50)
~~~

C++'s `this` is a hidden pointer (a `const Account*` in `const` member functions); members can be named without it. Python's `self` is an explicit first parameter, and attribute access must go through it: without `self.`, `_balance += amount` raises `UnboundLocalError`.

## When OOP is the wrong tool

Classes pay off when data has **rules** (invariants), **identity** that persists while its state changes, or **several interchangeable implementations** behind one interface. Otherwise they add ceremony:

- **Pure computations.** A stateless class with one method is a function in disguise: `TemperatureConverter().convert(c)` should be `to_fahrenheit(c)`.
- **Plain data without rules.** A C++ `struct` or a Python `dataclass` is enough.
- **Data pipelines.** Algorithms, ranges and comprehensions read better.
- **Hot loops over millions of items.** Performance code often prefers one array per field: parallel arrays return, guarded inside a class.

Both languages are **multi-paradigm**: mix free functions, namespaces or modules, generic code and classes.

~~~cpp
namespace geometry {   // not a "GeometryUtils" class of static methods
    double distance(Point a, Point b) {
        return std::hypot(a.x - b.x, a.y - b.y);
    }
}
~~~
~~~python
import math

def distance(a, b):    # a module-level function: no class needed
    return math.hypot(a.x - b.x, a.y - b.y)
~~~

## Key takeaways

- Procedural code separates data from the functions that change it, scattering invariants; OOP bundles them so each rule lives in one place.
- An object is **state + behavior + identity**; a class is its blueprint.
- **Encapsulation** guards state, **abstraction** hides how, **inheritance** models is-a, **polymorphism** runs different code for one call.
- A C++ variable of class type *is* an object: assignment and pass-by-value copy; references (`&`) share.
- A Python variable is a *name* for a heap object: assignment and argument passing never copy.
- Identity (`&a == &b`, `a is b`) is not equality (`a == b`); Python classes compare by identity until you define `__eq__`.
- C++ destroys locals at scope end in reverse order; CPython frees an object when its last reference goes away.
- A method call is a message to one object; `this` / `self` names that object.

## Common pitfalls

- Expecting `b = a` to copy in Python, or to alias in C++: the languages do opposite things.
- Mutating a caller's list inside a Python function by accident; return a new list instead.
- Using `is` to compare numbers, strings or lists; use `==`.
- Taking a C++ parameter by value when the function must modify the caller's object; use `T&`.
- Wrapping a stateless computation in a class "because it is OOP".
