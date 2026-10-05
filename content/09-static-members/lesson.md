## Data that belongs to the class

Some facts are about the *class*, not any one object: how many users exist, the next free id, the list of allowed pizza toppings. Storing them in every instance wastes memory and lets copies drift apart. **Class-level members** live once, shared by all instances.

## Static data in C++

~~~cpp
class User {
public:
    User() : id_(++lastId) { ++live; }
    static int liveCount() { return live; }
    static constexpr int MaxName = 32;      // compile-time constant, defined in-class
private:
    int id_;
    static inline int lastId = 0;           // C++17: declaration and definition together
    static inline int live = 0;
};
~~~
~~~python
class User:
    MAX_NAME = 32          # class attribute, one copy
    _last_id = 0
    live = 0

    def __init__(self):
        User._last_id += 1
        self.id = User._last_id
        User.live += 1
~~~

A plain `static int x;` inside a class is only a **declaration**; before C++17 it needed exactly one definition in a `.cpp` file (`int User::x = 0;`). `static inline` (C++17) defines it right in the class, and `static constexpr` data members are implicitly `inline` and usable in constant expressions. Static data exists for the whole program, even with zero objects.

## Static member functions

~~~cpp
class Temp {
public:
    static Temp fromCelsius(double c) { return Temp(c); }  // no this pointer
    double celsius() const { return c_; }
private:
    explicit Temp(double c) : c_(c) {}
    double c_;
};
Temp t = Temp::fromCelsius(21.5);   // called on the class
~~~
~~~python
class Temp:
    def __init__(self, c): self._c = c

    @staticmethod
    def c_to_f(c):                  # no self, no cls
        return c * 9 / 5 + 32

Temp.c_to_f(100)    # 212.0
~~~

A static member function has **no `this`**, so it can touch only static members (or members of an object it is handed). Using a non-static member inside it is a compile error. A private constructor plus static factories is the *named constructor* idiom: `fromCelsius` and `fromKelvin` say what the number means.

## Python class attributes and the shadowing bug

~~~cpp
// C++ has no hidden copy: User::live is the one variable.
// Writing live++ inside a member always changes the shared counter.
~~~
~~~python
class Counter:
    count = 0
    def hit_bad(self):
        self.count += 1             # reads Counter.count, then creates self.count!
    def hit_good(self):
        type(self).count += 1       # updates the class attribute

a = Counter()
a.hit_bad()
a.count, Counter.count    # (1, 0): only `a` got its own attribute
a.hit_good()
a.count, Counter.count    # (1, 1): instance attribute shadows the class one
~~~

Attribute reads look at the instance first, then the class. An assignment through `self` always creates or updates an **instance** attribute, so `self.count += 1` means `self.count = self.count + 1`: the right side reads the class value and the left side shadows it. Use `Counter.count += 1` or `type(self).count += 1`. `type(self)` respects subclasses: `type(self).count += 1` in a subclass creates a *separate* count on that subclass the first time, while `Counter.count += 1` always updates the base.

> **Pitfall:** Mutable class attributes (a list or dict) are shared by every instance. `self.items.append(x)` mutates the shared list; assign `self.items = []` in `__init__` for per-instance data.

## `@classmethod` alternate constructors

~~~cpp
class Pizza {
public:
    static Pizza margherita() { return Pizza({"tomato", "mozzarella"}); }
    explicit Pizza(std::vector<std::string> t) : toppings_(std::move(t)) {}
private:
    std::vector<std::string> toppings_;
};
// A static function cannot know a subclass: it hardcodes Pizza.
~~~
~~~python
class Pizza:
    def __init__(self, toppings):
        self.toppings = list(toppings)

    @classmethod
    def margherita(cls):
        return cls(["tomato", "mozzarella"])     # cls is the class it was called on

    @classmethod
    def from_string(cls, text):
        return cls(text.split(","))

class GlutenFreePizza(Pizza):
    pass

type(GlutenFreePizza.margherita()).__name__    # 'GlutenFreePizza'
~~~

A classmethod receives the class itself as `cls`. Because it calls `cls(...)` instead of `Pizza(...)`, subclasses get instances of their own type. Hardcoding `Pizza(...)` inside a classmethod is the bug: the subclass call silently returns a plain `Pizza`.

## `@staticmethod` vs module function

~~~cpp
// Related helper: a static member keeps it next to the class.
class Parser {
public:
    static bool parseBool(const std::string& s) { return s == "yes" || s == "true"; }
};
~~~
~~~python
class Config:
    @staticmethod
    def parse_bool(text):
        return text.strip().lower() in {"yes", "true", "1", "on"}
    # identical behavior to a module-level function parse_bool(text),
    # but namespaced under Config and overridable by subclasses
~~~

A `@staticmethod` is an ordinary function stored in the class namespace. Choose it when the helper belongs to the class conceptually; otherwise a module-level function is just as good and often simpler. If the function needs the class (to construct or to read class data), make it a `@classmethod`.

> **C++ vs Python:** C++ `static` data is a single variable and has no instance-shadowing problem. A Python class attribute is only a *default that instances may shadow*.

## Function-local statics and initialization order

~~~cpp
int nextTicket() {
    static int n = 0;       // initialized once, on first call; keeps value between calls
    return ++n;
}
// Globals in different .cpp files are initialized in an unspecified order
// ("static initialization order fiasco"). Wrap them in a function-local static:
Registry& registry() { static Registry r; return r; }
~~~
~~~python
def next_ticket():
    next_ticket.n += 1
    return next_ticket.n
next_ticket.n = 0   # module-level code runs top to bottom, so order is predictable
~~~

A function-local static is initialized the first time control reaches it (thread-safe since C++11) and avoids the cross-file ordering problem.

## Counting instances correctly

~~~cpp
class Widget {
    static inline int live_ = 0;
public:
    Widget()                    { ++live_; }
    Widget(const Widget&)       { ++live_; }   // forgetting this gives a negative count
    ~Widget()                   { --live_; }
    static int live() { return live_; }
};
~~~
~~~python
class Widget:
    live = 0
    def __init__(self):
        type(self).live += 1
    def __del__(self):
        type(self).live -= 1     # CPython: runs when the refcount hits 0
~~~

If you only count in the default constructor, copies are created by the compiler-generated copy constructor (which does not increment) but destroyed by the destructor (which does), so the counter goes negative.

## Key takeaways

- A static member belongs to the class: one copy, shared by all instances, alive for the whole program.
- C++17 `static inline` defines static data in the class; `static constexpr` data is implicitly inline.
- A static member function has no `this`, so it cannot use non-static members.
- Python class attributes are read through instances, but assignment via `self` creates a shadowing instance attribute.
- Use `type(self).attr` or `ClassName.attr` to modify class-level state.
- `@classmethod` gets `cls` and builds the right subclass; `@staticmethod` gets neither `self` nor `cls`.
- Function-local statics initialize once, on first use, and avoid the static initialization order fiasco.
- Count live instances in the constructor, the copy constructor and the destructor.

## Common pitfalls

- `self.count += 1` in Python: the counter appears to work for one object and the class never changes.
- Hardcoding the class name inside a `@classmethod`, so subclasses get the wrong type.
- Calling a non-static member from a static C++ function.
- Forgetting the copy constructor when counting instances.
- Sharing a mutable class attribute (list or dict) between all instances by accident.
