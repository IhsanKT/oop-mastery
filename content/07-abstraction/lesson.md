## Why abstraction?

You rely on abstractions all day. `v.push_back(x)` and `items.append(x)` tell you **what** happens (the item goes on the end) and hide **how** (when memory grows, what gets copied). That split is abstraction: a class exposes *what* it can do and hides *how*, so callers depend on a small, stable promise instead of details that may change.

Modules 05–06 let you write code against a base class. But look at the base you had to write:

~~~cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0; }  // a made-up default
};
class Circle : public Shape { /* forgot area(): silently 0 */ };

Shape s;   // compiles, but what *is* a plain shape?
~~~
~~~python
class Shape:
    def area(self):
        raise NotImplementedError  # fails only when called

class Circle(Shape): ...           # forgot area()

c = Circle()   # fine...
c.area()       # ...NotImplementedError, far from the mistake
~~~

There is no sensible area for "a shape in general". What we mean is: *every concrete shape must provide `area()`, and a plain `Shape` must not exist.* Both languages can say that, and check it.

## Pure virtual functions and abstract classes

~~~cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;        // pure virtual: no default
    virtual double perimeter() const = 0;
    std::string kind() const { return "shape"; }  // ordinary members are fine
};

class Square : public Shape {
public:
    explicit Square(double s) : side_(s) {}
    double area() const override { return side_ * side_; }
    // no perimeter(): Square is still abstract
private:
    double side_;
};

Shape s;        // error: cannot declare variable 's' to be of abstract type 'Shape'
Square sq(2);   // error: ... abstract type 'Square'; note: because the following
                // virtual functions are pure within 'Square': ...perimeter()
Shape* p = nullptr;   // fine: pointers and references are allowed
~~~
~~~python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self): ...

    @abstractmethod
    def perimeter(self): ...

class Square(Shape):        # defining it is fine...
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side ** 2

Shape()     # TypeError: Can't instantiate abstract class Shape without an
            # implementation for abstract methods 'area', 'perimeter'
Square(2)   # TypeError: ... abstract method 'perimeter'
~~~

The rules:

- `= 0` makes a virtual function **pure**. A class with at least one pure virtual function, declared in it or inherited and not yet overridden, is **abstract**: `Shape s;`, `new Shape` and a function defined with a by-value `Shape` parameter are all errors.
- A derived class **stays abstract** until it overrides *every* pure virtual it inherits. The error appears where you create an object, and GCC's note lists what is still missing.
- An abstract class may still have constructors, data members and ordinary member functions. Pointers and references to it are the whole point: a `Shape&` can refer to any concrete shape. (Calling one of its pure virtuals virtually from its constructor or destructor is undefined behaviour.)
- `std::is_abstract_v<Shape>` reports it at compile time.

> **C++ vs Python:** C++ rejects the program at compile time. Python checks when an object is created: defining the incomplete `Square` is legal, and `Square(2)` raises `TypeError`. Either way the mistake surfaces before any method is called, much earlier than `NotImplementedError`.

> **Under the hood:** When a class is created, `ABCMeta` (the metaclass behind `ABC`) stores its still-abstract method names in `__abstractmethods__` (`frozenset({'perimeter'})` for `Square`), and `object.__new__` refuses a class whose set is not empty.

## Interfaces: a contract and nothing else

An **interface** is an abstract class with no data and no implementation: only pure virtual functions plus a virtual destructor. It names a *role* an object can play.

~~~cpp
class Logger {                        // the role "can log"
public:
    virtual ~Logger() = default;      // delete through Logger* is safe
    virtual void log(const std::string& msg) = 0;
};

class ConsoleLogger : public Logger {
public:
    void log(const std::string& msg) override { std::cout << msg << '\n'; }
};

std::unique_ptr<Logger> lg = std::make_unique<ConsoleLogger>();
lg->log("ready");   // virtual call; ~ConsoleLogger runs when lg dies
~~~
~~~python
class Logger(ABC):                    # the role "can log"
    @abstractmethod
    def log(self, msg: str) -> None: ...

class ConsoleLogger(Logger):
    def log(self, msg):
        print(msg)

lg: Logger = ConsoleLogger()
lg.log("ready")
~~~

The virtual destructor is not optional: interfaces are used through base pointers, and deleting a derived object through a `Logger*` with a non-virtual destructor is undefined behaviour (Module 06). GCC's `-Wall` warns: *deleting object of abstract class type 'Logger' which has non-virtual destructor will cause undefined behavior*.

A class may implement several interfaces: `class Document : public Printable, public Savable`. Since interfaces carry no data, this is the easy case of multiple inheritance (Module 12).

### Pure virtual functions with a body

`= 0` means "derived classes must override this", not "this has no code". You may define a pure virtual function **outside** the class, as a default that overrides can opt into:

~~~cpp
class Notifier {
public:
    virtual ~Notifier() = default;
    virtual std::string send(const std::string& msg) const = 0;
};
// Outside the class: "= 0 { ... }" inside it is an error.
std::string Notifier::send(const std::string& msg) const {
    return "[" + msg + "]";
}

class Email : public Notifier {
public:
    std::string send(const std::string& msg) const override {
        return "email " + Notifier::send(msg);   // qualified call runs the body
    }
};
~~~
~~~python
class Notifier(ABC):
    @abstractmethod
    def send(self, msg):
        return f"[{msg}]"          # abstract, yet it has a body

class Email(Notifier):
    def send(self, msg):
        return "email " + super().send(msg)

Email().send("hi")   # 'email [hi]'
~~~

`Notifier` stays abstract and `Email` must still override `send`. The body runs only when called by **qualified name**, like `Notifier::send(msg)`: a virtual call on a finished object always reaches an override. The classic use is a **pure virtual destructor** (`virtual ~Marker() = 0;`), which makes a class abstract when no other function is a natural candidate. It *must* be defined (`Marker::~Marker() = default;`) because every derived destructor calls it; otherwise linking fails with an *undefined reference* to `Marker::~Marker()`.

## Python ABCs in depth

~~~cpp
class PaymentMethod {
public:
    virtual ~PaymentMethod() = default;
    virtual std::string name() const = 0;    // read-only "property"
    virtual std::string pay(double amount) = 0;
};
~~~
~~~python
class PaymentMethod(ABC):
    @property
    @abstractmethod               # innermost decorator
    def name(self) -> str: ...

    @abstractmethod
    def pay(self, amount: float) -> str: ...

class Cash(PaymentMethod):
    name = "cash"                 # a plain attribute also satisfies it
    def pay(self, amount):
        return f"paid {amount} in {self.name}"
~~~

- **When:** enforcement happens at **instantiation**, not when the class is defined and not when a method is called. An incomplete subclass is a legal class you cannot instantiate, which is handy for intermediate abstract bases.
- **Abstract properties:** put `@property` on top of `@abstractmethod`. The reverse order raises `AttributeError` when the class is created. (`abc.abstractproperty` is deprecated since 3.3.)
- **What counts as implemented:** any non-abstract attribute of that name in the subclass: a method, a property or a plain class attribute.
- **Virtual subclasses:** `PaymentMethod.register(Other)` makes `isinstance`/`issubclass` answer `True` with no inheritance and no method check: a promise, not a check.

> **Pitfall:** `@abstractmethod` does nothing on its own: it only sets `__isabstractmethod__ = True` on the function. Only `ABCMeta` turns those marks into `__abstractmethods__`, the set `object.__new__` checks, so in a class that does not inherit `ABC` (or use `metaclass=ABCMeta`), incomplete subclasses instantiate happily.

## Protocols: structural interfaces

`ABC` is **nominal**: a class is a `PaymentMethod` because it *says so*. Often you just want "anything with a `draw()` method", including classes you cannot change. That is `typing.Protocol`. Compare a run-time "can it draw?" question in each language:

~~~cpp
// Nominal: true only if the object's class inherits Drawable
if (auto* d = dynamic_cast<const Drawable*>(&obj)) std::cout << d->draw();
~~~
~~~python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Drawable(Protocol):
    def draw(self) -> str: ...

class Circle:                   # no base class, no registration
    def draw(self) -> str:
        return "()"

isinstance(Circle(), Drawable)  # True, thanks to @runtime_checkable
Drawable in Circle.__mro__      # False: no inheritance involved
~~~

- A Protocol is checked by **static type checkers** (mypy, pyright) before the program runs: a parameter annotated `Drawable` accepts a `Circle` because its shape matches. The interpreter ignores annotations, so passing `42` still runs and fails inside with `AttributeError`.
- Without `@runtime_checkable`, `isinstance(x, Drawable)` raises `TypeError`. With it, `isinstance` only checks that members with those **names** exist, not their signatures or types: a class with `def draw(self, x, y)`, or even `draw = 5`, passes.
- Protocols cannot be instantiated. A class *may* inherit a protocol explicitly, but never needs to.

## Nominal vs structural typing

| | Nominal: "declared to be" | Structural: "has the right shape" |
|---|---|---|
| C++ | abstract base class, virtual dispatch at run time | template + **concept**, checked at compile time |
| Python | `abc.ABC`, checked at instantiation | `typing.Protocol`, checked by type checkers |

C++20 **concepts** are C++'s structural interfaces (Module 15). A concept names requirements; a template constrained by it accepts every type that meets them:

~~~cpp
template <typename T>
concept Drawable = requires(const T& t) {
    { t.draw() } -> std::convertible_to<std::string>;
};

struct Circle { std::string draw() const { return "()"; } };  // no base

void render(const Drawable auto& d) { std::cout << d.draw() << '\n'; }

render(Circle{});   // OK
render(42);         // error: no matching function ... constraints not satisfied
~~~
~~~python
def render(d: Drawable) -> None:   # the Protocol above
    print(d.draw())

render(Circle())    # OK
render(42)          # type checker: error. Interpreter: runs, AttributeError
~~~

A concept is *enforced* by the compiler and resolved per type at compile time, with no vtable. But it is not a type: in C++, holding mixed types in one container at run time needs an abstract base (or type erasure). A Protocol is *advisory*, yet it is a type: a `list[Drawable]` holds any conforming objects. Choose nominal interfaces for a family you own, structural ones to accept "anything that fits".

## Small interfaces, injected

Good interfaces are **small** and named after a **role** (`Logger`, `Clock`, `PaymentMethod`). Classes then **depend on the interface** and receive the concrete object from outside (*dependency injection*):

~~~cpp
class SignupService {
public:
    explicit SignupService(Logger& log) : log_(log) {}  // injected
    void signUp(const std::string& name) {
        users_.push_back(name);
        log_.log("welcome " + name);
    }
private:
    Logger& log_;                     // knows the role, not the class
    std::vector<std::string> users_;
};

struct FakeLogger : Logger {          // a test double
    std::vector<std::string> lines;
    void log(const std::string& m) override { lines.push_back(m); }
};

FakeLogger fake;
SignupService svc(fake);
svc.signUp("Ada");   // fake.lines: {"welcome Ada"}
~~~
~~~python
class SignupService:
    def __init__(self, log: Logger):     # injected
        self._log = log
        self._users = []

    def sign_up(self, name):
        self._users.append(name)
        self._log.log(f"welcome {name}")

class FakeLogger(Logger):                # a test double
    def __init__(self):
        self.lines = []

    def log(self, msg):
        self.lines.append(msg)

fake = FakeLogger()
SignupService(fake).sign_up("Ada")   # fake.lines: ['welcome Ada']
~~~

`SignupService` never names `ConsoleLogger`, so a test hands it a `FakeLogger` and asserts on `lines`: no console capture, no files. Production can switch to a file logger without touching `SignupService`. Module 18 names these ideas **interface segregation** (several small role interfaces beat one fat one) and **dependency inversion** (high-level code depends on abstractions).

> **Pitfall:** A **leaky abstraction** exposes its implementation: a `UserStore` whose `cursor()` returns a database cursor, or a `Logger` with `flushToDisk()`. Callers that use it are tied to that implementation, and an in-memory version cannot honestly implement it. Ask of every member: *would every reasonable implementation provide this?*

## Key takeaways

- Abstraction exposes *what* an object does and hides *how*; callers depend on the promise, not the details.
- `= 0` makes a virtual function pure; a class with any pure virtual (its own, or inherited and not overridden) is abstract and cannot be instantiated.
- An interface has only pure virtuals plus a **virtual destructor**. A pure virtual may still have a body, reachable only by a qualified call.
- With `ABC` + `@abstractmethod`, instantiating an incomplete class raises `TypeError`; stack `@property` over `@abstractmethod` for abstract properties.
- `typing.Protocol` is structural and checked by type checkers; `@runtime_checkable` makes `isinstance` work, but it checks names only.
- Abstract classes are nominal with run-time dispatch; C++20 concepts are structural and checked at compile time.
- Depend on small role interfaces and inject the implementation: the code becomes testable and replaceable.

## Common pitfalls

- Giving a base class a fake default (`return 0;`, `pass`) instead of making the function pure or abstract.
- Forgetting the virtual destructor on an interface that objects are deleted through.
- Using `@abstractmethod` in a class that does not inherit `ABC`: nothing is enforced.
- Writing `@abstractmethod` above `@property`, or expecting a Protocol `isinstance` check to verify signatures.
- Declaring a pure virtual destructor without defining it: a linker error.
- Fat or leaky interfaces that force implementations to fake members or expose internals.
