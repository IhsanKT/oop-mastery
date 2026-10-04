## Why encapsulation?

A bank account has one rule that must never break: **the balance is never negative**. Here is the version almost everyone writes first:

~~~cpp
struct Account {
    double balance = 0;   // anyone can write to it
};

Account a;
a.balance -= 500;   // overdraft: nothing stops it
~~~
~~~python
class Account:
    def __init__(self):
        self.balance = 0   # anyone can write to it

a = Account()
a.balance -= 500    # overdraft: nothing stops it
~~~

The rule lives nowhere in the code, so every line that touches `balance` must remember it, and a violation could come from anywhere.

A rule like "balance ≥ 0" is an **invariant**: a condition that holds for every object of the class whenever outside code can observe it, from the end of the constructor and before and after every public operation. Inside a member function it may be briefly false, if it is restored before returning.

**Encapsulation** bundles the data with the operations that maintain its invariants, and makes those operations the *only* way in. The constructor establishes the invariant; every public function preserves it. If it ever breaks, the bug is inside one class.

~~~cpp
class Account {
public:
    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("amount must be positive");
        balance_ += amount;
    }
    void withdraw(double amount) {
        if (amount <= 0 || amount > balance_) throw std::invalid_argument("bad withdrawal");
        balance_ -= amount;
    }
    double balance() const { return balance_; }
private:
    double balance_ = 0;   // only Account's own code can touch it
};
~~~
~~~python
class Account:
    def __init__(self):
        self._balance = 0   # internal, by convention

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    def withdraw(self, amount):
        if amount <= 0 or amount > self._balance:
            raise ValueError("bad withdrawal")
        self._balance -= amount

    @property
    def balance(self):   # read-only attribute (see @property)
        return self._balance
~~~

## Access specifiers

~~~cpp
class Account {
public:      // the interface: any code may use these
    void deposit(double amount);
protected:   // this class, its friends and derived classes (Module 05)
    void log(const std::string& msg);
private:     // this class and its friends only
    double balance_ = 0;
};

Account a;
a.deposit(10);   // OK
a.balance_ = 5;  // error: 'double Account::balance_' is private within this context
~~~
~~~python
class Account:
    def __init__(self):
        self._balance = 0   # "internal, hands off": a convention

a = Account()
a._balance = 5          # runs: Python never checks access
~~~

- C++ checks access **at compile time**, on names. It costs nothing at run time and prevents mistakes, not attacks.
- `class` members are private by default, `struct` members public; apart from the default inheritance mode, that is the only difference.
- `protected` opens members to derived classes, so every subclass can break the invariant. Prefer **private data**, plus protected *functions* as hooks. Module 05 has the full rules.

### Privacy is per class, not per object

~~~cpp
class Account {
public:
    bool richerThan(const Account& other) const {
        return balance_ > other.balance_;   // OK: other is also an Account
    }
private:
    double balance_ = 0;
};
~~~
~~~python
class Account:
    def richer_than(self, other):
        return self._balance > other._balance   # fine: same class
~~~

Access asks "*which code* is this?", not "*whose* object is it?". Any `Account` member function may use the private members of **any** `Account`, which is what makes copy constructors and `operator==` possible. The class is the unit of trust: one author owns all its invariants.

## Getters and setters done right

A getter and setter for every field is a public field with extra typing: `if (a.getBalance() >= price) a.setBalance(a.getBalance() - price);` still keeps the rule in the caller. **Tell, don't ask:** tell the object what you want (`a.withdraw(price)`) and let it apply its own rules.

1. Design **operations** (`withdraw`, `addSong`), not one accessor per field.
2. Validate in the constructor and **every** mutator, *before* changing anything, so a failed call leaves the object as it was.
3. Make getters `const`. Return cheap values by value, large members by **const reference** (no copy, no modification).
4. Never return a **non-const** reference or pointer to a private member: it is a key to your private data.

~~~cpp
class Playlist {
public:
    void addSong(std::string title) {
        if (title.empty()) throw std::invalid_argument("empty title");
        songs_.push_back(std::move(title));
    }
    const std::vector<std::string>& songs() const { return songs_; }  // read-only
    // std::vector<std::string>& songs() { return songs_; }
    //   leak: p.songs().push_back("") skips the check in addSong
private:
    std::vector<std::string> songs_;
};
~~~
~~~python
class Playlist:
    def __init__(self):
        self._songs = []

    def add_song(self, title):
        if not title:
            raise ValueError("empty title")
        self._songs.append(title)

    def songs(self):
        return tuple(self._songs)   # a snapshot callers cannot modify
~~~

> **Note:** The trailing `const` in `double balance() const` promises not to modify the object, so it can be called through a `const Account&`. Without it, `a.balance()` on a `const Account& a` fails: *passing 'const Account' as 'this' argument discards qualifiers*. Module 13 covers const-correctness in depth.

> **Pitfall:** A returned reference is valid only while the object lives. `const auto& s = makePlaylist().songs();` dangles, because the temporary playlist dies at the end of the statement.

## friend: granting access on purpose

Some functions belong to a class's interface without being members. The classic case is `operator<<`: its left operand is the stream, so it cannot be your member, yet it needs your private data. The class can make it a **friend**:

~~~cpp
class Fraction {
public:
    Fraction(int num, int den) : num_(num), den_(den) {}
    friend std::ostream& operator<<(std::ostream& os, const Fraction& f);
private:
    int num_, den_;
};

std::ostream& operator<<(std::ostream& os, const Fraction& f) {
    return os << f.num_ << '/' << f.den_;   // allowed: a friend
}
~~~
~~~python
class Fraction:
    def __init__(self, num, den):
        self._num, self._den = num, den

    def __str__(self):         # Python's printing hook is just a method
        return f"{self._num}/{self._den}"
~~~

Friendship is **granted** by the class, never taken, and is not inherited, transitive or mutual. `friend class ListIterator;` befriends a whole class, which suits tightly coupled pairs like a container and its iterator. A friend is legitimate when it is part of the interface and maintained with the class; befriending code to "make it compile" is a backdoor. Module 08 uses friends for operators; Module 13 shows the "hidden friend" idiom.

> **C++ vs Python:** Python has no `friend`. Informally the module is the unit of trust: a helper in the same module may use a class's `_names`.

## Python's `_x` and `__x`

One leading underscore means "internal; subclasses may use it". Nothing enforces it; linters warn, and `from module import *` skips module-level `_names`.

Two leading underscores (and at most one trailing) trigger **name mangling**: inside a class body, `__x` becomes `_ClassName__x`. This stops a subclass from *accidentally* overwriting a base class's attribute, since all of an object's attributes share one `__dict__`. C++ needs no such trick: same-named members of different classes are distinct.

~~~cpp
class Base {
    int id_ = 1;   // Base::id_ (private by default)
};

class Derived : public Base {
    int id_ = 2;   // Derived::id_: a second member, no clash
};                 // every Derived holds both ints
~~~
~~~python
class Base:
    def __init__(self):
        self.__id = 1          # stored as _Base__id

    def base_id(self):
        return self.__id       # compiled as self._Base__id

class Derived(Base):
    def __init__(self):
        super().__init__()
        self.__id = 2          # stored as _Derived__id: no clash

d = Derived()
d.base_id()                # 1
sorted(vars(d))            # ['_Base__id', '_Derived__id']
d._Base__id                # 1: renamed, not hidden
~~~

> **Under the hood:** Mangling rewrites *identifiers* in a class body at compile time: `self.__x`, `other.__x`, even locals. Strings are not rewritten, so `hasattr(obj, "__x")` looks for the literal name. Names ending in two underscores (`__init__`) are never mangled.

> **Pitfall:** `__x` is not "private": anyone can write `obj._Class__x`. Use `_x` for internals; keep `__x` for avoiding clashes in classes meant to be subclassed.

## `@property`

In C++, turning a public field into a function breaks every caller (`p.x = 3` must become `p.setX(3)`), so classes use accessors from day one. Python's `@property` makes method calls look like attribute access: start with a plain attribute and, when you need validation or a computed value, replace it with a property of the **same name**. No caller changes, which is why idiomatic Python has no `get_x()`/`set_x()` pairs.

~~~cpp
class Circle {
public:
    explicit Circle(double r) { setRadius(r); }
    double radius() const { return radius_; }
    void setRadius(double r) {
        if (r < 0) throw std::invalid_argument("negative radius");
        radius_ = r;
    }
    double area() const { return 3.141592653589793 * radius_ * radius_; }
private:
    double radius_ = 0;
};
~~~
~~~python
import math

class Circle:
    def __init__(self, radius):
        self.radius = radius   # runs the setter: validated too

    @property
    def radius(self):          # c.radius
        return self._radius

    @radius.setter
    def radius(self, value):   # c.radius = value
        if value < 0:
            raise ValueError("negative radius")
        self._radius = value

    @property
    def area(self):            # computed and read-only
        return math.pi * self._radius ** 2
~~~

- The value lives in `self._radius`; `self.radius = value` *inside* the setter would call the setter again, until `RecursionError`.
- `area` has no setter: `c.area = 5` raises `AttributeError: property 'area' of 'Circle' object has no setter`.
- A computed property is recalculated on every access, so it never goes stale.

> **Under the hood:** `property` is a *descriptor* stored on the class; lookup finds it before the instance `__dict__`, so `c.radius = 5` calls the setter. Module 14 shows how descriptors work.

## Defensive copies and immutability

Private data is only private if no reference to it escapes. Python assignment never copies, so two leaks are common: keeping the caller's list and returning your own.

~~~cpp
class Team {
public:
    explicit Team(std::vector<std::string> members)   // by value: Team owns a copy
        : members_(std::move(members)) {}
    const std::vector<std::string>& members() const { return members_; }
private:
    std::vector<std::string> members_;
};
~~~
~~~python
class Team:
    def __init__(self, members):
        self._members = list(members)   # copy in

    def members(self):
        return list(self._members)      # copy out (or a tuple)

names = ["Ann"]
t = Team(names)
names.append("Bob")        # t is unaffected
t.members().append("Cid")  # changes only the copy
~~~

> **C++ vs Python:** C++ containers have value semantics, so the leaks are reference or pointer members and non-const reference getters. Python copies only when asked (`list(x)`), and such copies are **shallow**: mutable elements are still shared (Module 10).

The strongest encapsulation is **immutability**: validate once in the constructor, offer no mutators, and the invariant holds forever. Immutable objects need no defensive copies; "changing" one returns a new object.

~~~cpp
class Point {
public:
    Point(double x, double y) : x_(x), y_(y) {}
    double x() const { return x_; }
    Point movedBy(double dx, double dy) const { return {x_ + dx, y_ + dy}; }
private:
    double x_, y_;   // no setters
};
~~~
~~~python
class Point:
    def __init__(self, x, y):
        self._x, self._y = x, y   # plus read-only properties

    def moved_by(self, dx, dy):
        return Point(self._x + dx, self._y + dy)   # a new object
~~~

`tuple`, `str` and `frozenset` are immutable, and `@dataclass(frozen=True)` builds immutable classes with less code (Module 14).

## Encapsulation vs abstraction

The two work together, so they are often confused:

| | Encapsulation | Abstraction |
|---|---|---|
| Asks | How is the data protected? | What must a user know? |
| Tools | access control, validation, copies | a small interface (Module 07) |

~~~cpp
class Clock {
public:
    int hours() const { return mins_ / 60; }     // abstraction:
    int minutes() const { return mins_ % 60; }   // what callers see
private:
    int mins_ = 0;   // encapsulation: a hidden choice
};
~~~
~~~python
class Clock:
    def __init__(self):
        self._mins = 0   # hidden representation

    @property
    def hours(self): return self._mins // 60

    @property
    def minutes(self): return self._mins % 60
~~~

Abstraction chose the interface; encapsulation keeps it the only way in, so switching to separate hour and minute fields would change no caller.

## Key takeaways

- An **invariant** holds whenever outside code can observe the object; encapsulation makes the class the only code that can break it.
- C++ enforces `private`/`protected` at compile time, **per class, not per object**. `class` defaults to private.
- Tell, don't ask: expose operations, validate in constructors and every mutator, before changing state.
- Getters are `const`; return large members by const reference, never by non-const reference.
- `friend` grants access to chosen functions or classes that belong to the interface, like `operator<<`.
- Python relies on convention: `_x` means internal; `__x` is mangled to `_Class__x` to avoid subclass clashes.
- `@property` gives computed, validated and read-only attributes without breaking callers.
- Copy mutable data on the way in and out, or make the object immutable.

## Common pitfalls

- A getter and setter for every field: the rule still lives in every caller.
- Returning a non-const reference (C++) or the internal list (Python): callers can modify private state.
- Writing `self.x = value` inside the setter of property `x`: infinite recursion. Store it in `self._x`.
- Storing the caller's list in Python without copying it.
- Treating `__x` as real privacy, or using `friend` just to make code compile.
- Forgetting `const` on getters, so they cannot be called on `const` objects or references.
