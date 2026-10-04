## Why constructors exist

Suppose a `Temperature` were created empty and filled in later. Until then it is invalid (an indeterminate C++ `double`, a missing Python attribute), and nothing stops anyone from storing -500 K.

A **constructor** closes that gap. Creating an object *always* runs it, so the object's **invariant** (the rules that make it valid, here "kelvin ≥ 0") holds from the first moment anyone can see the object. If the constructor throws, there is no object at all. A **destructor** is the mirror image: code that runs automatically when the object's lifetime ends.

~~~cpp
class Temperature {
public:
    explicit Temperature(double kelvin) : kelvin_(kelvin) {
        if (kelvin_ < 0) throw std::invalid_argument("below absolute zero");
    }
private:
    double kelvin_;   // invariant: kelvin_ >= 0, for the object's whole life
};
~~~
~~~python
class Temperature:
    def __init__(self, kelvin):
        if kelvin < 0:
            raise ValueError("below absolute zero")
        self.kelvin = kelvin

t = Temperature(-5)   # raises: t is never bound to a broken object
~~~

## Default constructors, `= default` and member initializers

~~~cpp
class Counter {
public:
    Counter() = default;      // compiler-written, uses the initializers below
    explicit Counter(int start) : count_(start) {}
private:
    int count_ = 0;           // default member initializer
    std::string label_ = "counter";
};

Counter a;      // count_ == 0, label_ == "counter"
Counter b(5);   // count_ == 5: the initializer list wins over "= 0"
// Counter c(); // declares a FUNCTION (GCC: -Wvexing-parse). Write Counter c; or Counter c{};
~~~
~~~python
class Counter:
    def __init__(self, start=0, label="counter"):   # one __init__, default arguments
        self.count = start
        self.label = label

a = Counter()
b = Counter(5)
~~~

- If a class declares **no** constructor, the compiler writes a default one. Declaring *any* constructor suppresses it (*no matching function for call to 'Counter::Counter()'*); `Counter() = default;` brings it back.
- `T x;` with a compiler-written default constructor leaves `int`/`double` members that have no initializer **indeterminate**; reading them is undefined behavior. Give them default member initializers.

> **C++ vs Python:** Python has no overloading: a second `def __init__` silently replaces the first. Use default arguments, or `@classmethod` alternative constructors (Module 09). A class with no `__init__` inherits `object.__init__`, so `A(1)` raises `TypeError: A() takes no arguments`.

## The member-initializer list is not assignment

When a constructor **body** starts, every member is already initialized (from the list, else its default member initializer, else default-initialized), so the body can only *assign*. For a `std::string` that wastes work; for three kinds of members it is impossible:

~~~cpp
struct Engine { explicit Engine(int hp); };   // no default constructor

class Car {
public:
    Car(int id, Garage& g, int hp) : id_(id), garage_(g), engine_(hp) {}
    // With id_ = id; in the body instead, GCC reports
    //   error: uninitialized const member in 'const int'
    //   error: assignment of read-only member 'Car::id_'
private:
    const int id_;     // const: can be initialized, never assigned
    Garage& garage_;   // reference: must be bound at creation
    Engine engine_;    // has no default constructor
};
~~~
~~~python
class Car:
    def __init__(self, car_id, garage, hp):
        # no initializer list: attributes appear as they are assigned
        self.car_id = car_id
        self.garage = garage
        self.engine = Engine(hp)
~~~

### Initialization order is declaration order

Members are initialized in the order they are **declared in the class**, never in the order the list is written, which matters when one member is computed from another:

~~~cpp
class Buffer {
public:
    explicit Buffer(std::size_t n) : size_(n), data_(size_, 0) {}   // looks fine...
private:
    std::vector<int> data_;   // ...but data_ is declared first, so it is built first,
    std::size_t size_;        // from size_, still uninitialized: undefined behavior
};
~~~
~~~python
class Buffer:
    def __init__(self, n):
        self.data = [0] * self.size   # AttributeError: 'Buffer' object has no attribute 'size'
        self.size = n                 # runs top to bottom, failing loudly
~~~

GCC's `-Wreorder` (in `-Wall`) warns: *'Buffer::size_' will be initialized after*. Write lists in declaration order, and build members from parameters (`data_(n, 0)`).

## Delegating constructors

One constructor can hand the whole job to another, so validation lives in one place:

~~~cpp
class Window {
public:
    Window(std::string title, int w, int h) : title_(std::move(title)), w_(w), h_(h) {
        if (w_ <= 0 || h_ <= 0) throw std::invalid_argument("bad size");
    }
    explicit Window(std::string title) : Window(std::move(title), 800, 600) {}
    Window() : Window("untitled") {}   // delegation can chain
private:
    std::string title_;
    int w_, h_;
};
~~~
~~~python
class Window:
    def __init__(self, title="untitled", w=800, h=600):
        if w <= 0 or h <= 0:
            raise ValueError("bad size")
        self.title, self.w, self.h = title, w, h

    @classmethod
    def square(cls, title, side):   # alternative constructor: reuses __init__
        return cls(title, side, side)
~~~

- The delegation must be the **only** entry in the initializer list.
- The target runs completely, list **and** body, before the delegating body.
- Once any constructor has finished, the object is alive: if the delegating body then throws, the destructor runs.

> **Pitfall:** `Window() { Window("untitled"); }` does not delegate. Inside a body, that statement creates a temporary `Window` and destroys it at the `;`, leaving `*this` default-initialized.

## `explicit`: no surprise conversions

A non-`explicit` constructor callable with one argument doubles as an **implicit conversion**: the compiler may silently use it to turn the argument into your type.

~~~cpp
class Meters {
public:
    explicit Meters(double v) : value(v) {}
    double value;
};
void walk(Meters m);

walk(Meters(2.5));   // OK: you asked for Meters
Meters a(5.0);       // OK: direct initialization
// walk(2.5);        // error: could not convert '2.5e+0' from 'double' to 'Meters'
// Meters b = 5.0;   // error: conversion from 'double' to non-scalar type 'Meters' requested
~~~
~~~python
class Meters:
    def __init__(self, value):
        self.value = value

def walk(m):
    print(m.value)

walk(Meters(2.5))   # you call constructors yourself
walk(2.5)           # no conversion: AttributeError: 'float' object has no attribute 'value'
~~~

Without `explicit`, `walk(2.5)` compiles, and nobody can tell whether 2.5 meant meters or feet. Make one-argument constructors `explicit` unless the conversion is natural and lossless (like `std::string` from `"text"`); `std::is_convertible_v<double, Meters>` checks it (more in Module 13).

## Destructors: when C++ objects die

A destructor runs at a precise moment that depends on how the object was created:

~~~cpp
struct Noisy {
    std::string name;
    explicit Noisy(std::string n) : name(std::move(n)) { std::cout << "+" << name << ' '; }
    ~Noisy() { std::cout << "-" << name << ' '; }
};

int main() {
    Noisy a("a");
    {
        Noisy b("b");
        Noisy c("c");
    }                               // -c -b: end of scope, reverse order
    Noisy* h = new Noisy("heap");   // lives until delete, whatever the scope
    delete h;                       // -heap
    std::cout << Noisy("tmp").name.size() << ' ';   // +tmp 3 -tmp
}                                   // -a
// prints: +a +b +c -c -b +heap -heap +tmp 3 -tmp -a
~~~
~~~python
def main():   # Noisy prints "+name" in __init__, "-name" in __del__
    a = Noisy("a")
    for _ in range(1):
        b = Noisy("b")     # no block scope: b outlives the loop
    n = len(Noisy("tmp").name)
    print(b.name, n)

main()   # CPython 3.13: +a +b +tmp -tmp b 3, then -a -b
~~~

- **Locals** die at the end of their block, in reverse order of construction, also when left by `return`, `break` or an exception (stack unwinding; an exception that is never caught may skip it).
- **Heap objects** die at `delete`. Forget it and the destructor **never runs**: memory leaks, and its cleanup (flushing, closing) never happens.
- **Temporaries** die at the end of the **full-expression** that created them (roughly, the `;`), unless bound to a local `const T&` or `T&&`, which extends their life to the reference's.
- **Statics** (globals, `static` locals) die after `main` returns, in reverse order of construction.
- **Members** die *after* the destructor body, in reverse declaration order, so the body can still use them (then the bases, Module 05).

> **C++ vs Python:** That Python output is a CPython detail: reference counting frees `tmp` the moment its count drops to zero, and `main`'s locals when its frame ends. The language promises neither the timing nor the order.

## Python: `__new__` creates, `__init__` initializes

`__init__` is often called "the constructor", but the object already exists when it runs. `Widget(3)` runs `type(Widget).__call__`, which (1) calls `Widget.__new__(Widget, 3)` to **create** the object, (2) if the result is an instance of `Widget`, calls `result.__init__(3)` to **initialize** it, and (3) returns it.

~~~cpp
Widget* w = new Widget(3);
// 1. memory for a Widget is allocated (operator new)
// 2. the constructor initializes that existing storage; having no
//    return value, it cannot hand back a different object
~~~
~~~python
class Widget:
    def __new__(cls, *args):          # implicitly static: receives the class
        print("__new__", args)
        return super().__new__(cls)   # object.__new__ makes the bare instance

    def __init__(self, size):         # receives what __new__ returned
        print("__init__", size)
        self.size = size              # must return None

w = Widget(3)   # __new__ (3,)   then   __init__ 3
~~~

`__init__` must return `None` (else `TypeError: __init__() should return None, not 'int'`). Override `__new__` only for immutable types (a `str` subclass must pass its final text to `super().__new__`: the value is fixed before `__init__` runs) or to control *which* object comes back (caching, singletons). If `__new__` returns something that is not an instance of the class, `__init__` is skipped; if it returns an existing instance, `__init__` runs on it again.

## `__del__` is not a destructor; `with` is Python's RAII

**RAII** (Resource Acquisition Is Initialization) acquires a resource in a constructor and releases it in the destructor, so leaving the scope *by any path* releases it. Python's finalizer `__del__` cannot play that role:

- **Timing is an implementation detail.** CPython calls it when the reference count hits zero; objects in cycles wait for the cyclic garbage collector; PyPy runs it whenever its collector does. `del x` only removes the *name* `x`.
- **It may never run.** Objects still alive at interpreter exit are not guaranteed to be finalized.
- **Errors vanish.** An exception in `__del__` is printed as `Exception ignored in: ...` and dropped.
- **It sees half-built objects.** It runs even when `__init__` raised.

Python's deterministic tool is `with`: `__enter__` runs as the block starts, `__exit__` when it ends, however it ends.

~~~cpp
class Guard {
public:
    explicit Guard(std::mutex& m) : m_(m) { m_.lock(); }   // acquire
    ~Guard() { m_.unlock(); }       // release: on return, break or exception
    Guard(const Guard&) = delete;   // a copy would unlock twice (Module 10)
    Guard& operator=(const Guard&) = delete;
private:
    std::mutex& m_;
};

{
    Guard g(bank_mutex);   // std::lock_guard is the standard version
    withdraw(amount);      // if this throws, ~Guard still unlocks
}
~~~
~~~python
class Guard:
    def __init__(self, lock):
        self.lock = lock

    def __enter__(self):          # start of the with block
        self.lock.acquire()
        return self               # bound by "as"

    def __exit__(self, exc_type, exc, tb):   # end of the block, however it ends
        self.lock.release()
        return False              # True would swallow the exception

with Guard(bank_lock):   # threading.Lock is itself a context manager
    withdraw(amount)     # if this raises, __exit__ still releases
~~~

`__exit__` gets the exception's type, value and traceback (`None`s on a normal exit). Nested `with` blocks exit in reverse order, like C++ locals. After `with open(path) as f:` the file is closed but `f` still exists: `with` ends the *resource*, not the object. Module 11 adds smart pointers, `contextlib` and `weakref.finalize`.

> **C++ vs Python:** In C++ the *type* guarantees cleanup: every `Guard` unlocks, and callers cannot forget. In Python the *caller* must opt in by writing `with`.

## Lifetime at a glance

| Object | Begins | Ends |
|---|---|---|
| C++ local ("stack") | at its declaration | end of its block, reverse order |
| C++ heap | `new T(...)` | `delete p`; never, if forgotten |
| C++ temporary | inside an expression | end of the full-expression (or of a `const T&` bound to it) |
| C++ static | program start; `static` local: first use | after `main`, reverse order |
| C++ member | before the owner's constructor body | after the owner's destructor body |
| Python object | `__new__`, then `__init__` | when unreachable (CPython: refcount 0, cycles at a GC run); maybe never |
| Python `with` resource | `__enter__` | `__exit__` at the end of the block, always |

## Key takeaways

- A constructor establishes the invariant, so no one ever sees an invalid object; if it throws, there is no object.
- Any user-declared C++ constructor removes the implicit default one; `= default` restores it.
- The initializer list *initializes*; the body only assigns. `const`, reference and non-default-constructible members need the list.
- Members are built in declaration order and destroyed in reverse, after the destructor body.
- Delegating constructors keep validation in one place; `explicit` stops silent conversions.
- C++ destructors run at precise points: end of scope, `delete`, end of the full-expression, program exit.
- `__new__` creates, `__init__` initializes; `__del__` timing is not guaranteed, so clean up with `with`.

## Common pitfalls

- Assigning `const` or reference members in the constructor body instead of the initializer list.
- Initializing a member from another member that is declared later.
- `new` without `delete`: the destructor never runs (Module 11's smart pointers fix this).
- Keeping a pointer or reference to a temporary after its full-expression has ended.
- Leaving one-argument constructors non-`explicit`, so stray values convert silently.
- Relying on `__del__` to close files or release locks instead of a `with` block.
