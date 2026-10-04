export default [
  {
    id: 'abstraction-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'A reviewer praises a `Logger` class as "a good abstraction". In OOP, what does **abstraction** mean?',
    options: [
      { text: 'Exposing *what* an object does through a small, stable interface and hiding *how* it does it, so callers depend only on that promise.', correct: true, why: 'Right. `log(msg)` says what happens; whether it writes to a file, a socket or memory is hidden and can change without touching callers.' },
      { text: 'Making every data member private.', correct: false, why: 'That is encapsulation, a tool that *enforces* hiding. A class with private fields and a getter/setter for each one still exposes its implementation, just one call away.' },
      { text: 'Putting shared code in a base class so that subclasses can reuse it.', correct: false, why: 'That is implementation inheritance. Abstraction needs no inheritance at all: `std::vector` and Python\'s `list` are abstractions with no base class in sight.' },
      { text: 'Declaring abstract classes: a class without pure virtual functions or `@abstractmethod` is not an abstraction.', correct: false, why: 'Abstract classes are one way to *express* an abstraction that several classes implement. A plain class, a function or a module can be just as good an abstraction.' },
    ],
    explanation: `**Abstraction** is a design decision: choose the few operations callers need (*what*) and hide everything else (*how*). \`v.push_back(x)\` and \`items.append(x)\` are abstractions: you know the item goes on the end, not when memory is reallocated.

Encapsulation (Module 04) is the mechanism that keeps the hidden part hidden, and abstract classes / interfaces let several implementations share one *what*. The payoff is that callers depend on a stable promise instead of on details that change.`,
  },
  {
    id: 'abstraction-q02', lang: 'cpp', type: 'bug', difficulty: 1,
    prompt: "This fails to compile with `error: cannot declare variable 's' to be of abstract type 'Shape'`. What is the right fix?",
    codeLang: 'cpp',
    code: `#include <iostream>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Square : public Shape {
public:
    explicit Square(double side) : side_(side) {}
    double area() const override { return side_ * side_; }
private:
    double side_;
};

void printArea(const Shape& s) { std::cout << s.area() << '\\n'; }

int main() {
    Shape s;              // error reported here
    printArea(s);
    printArea(Square(3));
}`,
    options: [
      { text: 'Remove `Shape s;` and `printArea(s);`: an abstract class cannot be instantiated. Create concrete objects such as `Square` and use `Shape` only through references or pointers.', correct: true, why: 'Abstract means "no object of exactly this type may exist". `printArea(Square(3))` already shows the intended use: a `const Shape&` bound to a concrete shape.' },
      { text: 'Remove `= 0` so that `area()` returns 0 by default.', correct: false, why: 'It compiles, but it brings back the fake default that `= 0` was there to forbid: a subclass that forgets `area()` would now silently report 0.' },
      { text: 'Create it on the heap instead: `Shape* s = new Shape;`', correct: false, why: '`new Shape` is rejected too (*invalid new-expression of abstract class type*). Abstractness forbids creating the object anywhere, not just on the stack.' },
      { text: 'Give the pure virtual function a body inside the class: `virtual double area() const = 0 { return 0; }`', correct: false, why: 'GCC rejects that (*pure-specifier on function-definition*). A pure virtual may have a body defined outside the class, but the class stays abstract either way.' },
    ],
    explanation: `A class with a pure virtual function is **abstract**: it describes a role, so no object of exactly that type may be created, whether as a variable, with \`new\`, or as a by-value parameter. Pointers and references to it are fine, and they are the point:

~~~cpp
Square sq(3);
const Shape& r = sq;                                // OK
std::unique_ptr<Shape> p = std::make_unique<Square>(2);  // OK
~~~

If a "plain shape" made sense, \`Shape\` should not have been abstract in the first place.`,
  },
  {
    id: 'abstraction-q03', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What happens when this program is compiled?',
    codeLang: 'cpp',
    code: `class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
};

class Circle : public Shape {
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159 * r_ * r_; }
private:
    double r_;
};

int main() {
    Circle c(1.0);        // (1)
    Shape* p = nullptr;   // (2)
}`,
    options: [
      { text: 'Line (1) is an error: `Circle` inherits the pure virtual `perimeter()` without overriding it, so `Circle` is abstract too. Line (2) is fine.', correct: true, why: 'A class with any pure virtual function, its own or inherited and not overridden, is abstract. GCC adds a note: the following virtual functions are pure within \'Circle\'.' },
      { text: 'The definition of `Circle` is an error: a derived class must override every pure virtual function of its base.', correct: false, why: 'Defining an abstract derived class is legal and useful (an intermediate base, for example). The error appears only where an object is created.' },
      { text: 'It compiles; calling `c.perimeter()` would later crash at run time.', correct: false, why: 'C++ catches this at compile time: an abstract class cannot be instantiated, so the program never gets to run.' },
      { text: 'It compiles; the compiler generates a `Circle::perimeter()` that returns 0.', correct: false, why: 'The compiler never invents bodies for virtual functions. A missing override simply leaves the function pure, and the class abstract.' },
      { text: 'Both lines are errors: you cannot even declare a pointer to an abstract class.', correct: false, why: 'Pointers and references to abstract classes are allowed; they are how abstract classes are used. Only creating an object is forbidden.' },
    ],
    explanation: `Abstractness is **inherited** until it is resolved. \`Circle\` overrides \`area()\` but not \`perimeter()\`, so it still has a pure virtual function and is itself abstract (\`std::is_abstract_v<Circle>\` is \`true\`). GCC reports *cannot declare variable 'c' to be of abstract type 'Circle'* and lists what is still pure.

The fix is to override \`perimeter()\` too (\`2 * 3.14159 * r_\`). Adding \`override\` to every implementation is good practice: it turns a typo in a signature into an error instead of a new, unrelated function.`,
  },
  {
    id: 'abstraction-q04', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from abc import ABC, abstractmethod


class Shape(ABC):
    @abstractmethod
    def area(self): ...

    @abstractmethod
    def perimeter(self): ...


class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side ** 2


print("class defined")
try:
    sq = Square(3)
    print(sq.area())
except Exception as e:
    print(type(e).__name__)`,
    options: [
      { text: 'class defined\nTypeError', correct: true, why: 'Defining an incomplete subclass is legal; creating an instance is not. `Square(3)` raises `TypeError` because `perimeter` is still abstract.' },
      { text: 'TypeError', correct: false, why: 'ABCs do not check at class-definition time. `class Square(Shape)` succeeds, so "class defined" is printed first.' },
      { text: 'class defined\n9', correct: false, why: '`area()` would work, but the object is never created: an ABC refuses to instantiate any class that still has an abstract method.' },
      { text: 'class defined\nNotImplementedError', correct: false, why: '`NotImplementedError` is what a hand-written placeholder raises when *called*. ABC enforcement happens earlier, at instantiation, and raises `TypeError`.' },
    ],
    explanation: `When \`Square\` is created, \`ABCMeta\` records its still-abstract methods in \`Square.__abstractmethods__\`, here \`frozenset({'perimeter'})\`. Creating an instance of a class whose set is non-empty raises:

~~~text
TypeError: Can't instantiate abstract class Square without an implementation for abstract method 'perimeter'
~~~

So the check happens at **instantiation time**: later than C++'s compile-time check, but earlier than a \`NotImplementedError\` that only fires when the missing method is finally called.`,
  },
  {
    id: 'abstraction-q05', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from abc import ABC, abstractmethod


class Greeter(ABC):
    @abstractmethod
    def name(self): ...

    def greet(self):
        return f"Hello, {self.name()}!"


class English(Greeter):
    def name(self):
        return "Ada"


g = English()
print(g.greet())
print(isinstance(g, Greeter), len(English.__abstractmethods__))`,
    options: [
      { text: 'Hello, Ada!\nTrue 0', correct: true, why: '`English` implements the only abstract method, so it is concrete. `greet` is an ordinary inherited method that calls `English.name`.' },
      { text: 'TypeError', correct: false, why: 'Every abstract method is implemented, so `English()` succeeds. An ABC may also contain concrete methods such as `greet`.' },
      { text: 'Hello, None!\nTrue 0', correct: false, why: '`self.name()` is looked up on the actual object, so it runs `English.name`, not the abstract placeholder whose body returns `None`.' },
      { text: 'Hello, Ada!\nFalse 0', correct: false, why: '`English` really inherits from `Greeter`, so `isinstance` is `True`. ABCs are ordinary base classes as far as `isinstance` is concerned.' },
      { text: 'Hello, Ada!\nTrue 1', correct: false, why: '`__abstractmethods__` is recomputed for every class. `name` is overridden in `English`, so its set is empty.' },
    ],
    explanation: `An ABC can mix abstract methods (the part subclasses must supply) with concrete ones that build on them. Here \`greet()\` is written once in \`Greeter\` and calls the abstract \`name()\`; each subclass fills in the gap. (Module 20 calls this the Template Method pattern.)

For every new class, \`ABCMeta\` recomputes \`__abstractmethods__\`: a name stays abstract only if the attribute the class ends up with is still marked abstract. \`English.name\` is a normal function, so the set is empty and instances can be created.`,
  },
  {
    id: 'abstraction-q06', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Speaker {
public:
    virtual ~Speaker() { std::cout << "~Speaker\\n"; }
    virtual std::string speak() const = 0;
};

class Dog : public Speaker {
public:
    ~Dog() override { std::cout << "~Dog\\n"; }
    std::string speak() const override { return "Woof"; }
};

class Robot : public Speaker {
public:
    std::string speak() const override { return "Beep"; }
};

int main() {
    std::vector<std::unique_ptr<Speaker>> all;
    all.push_back(std::make_unique<Robot>());
    all.push_back(std::make_unique<Dog>());
    for (const auto& s : all) std::cout << s->speak() << '\\n';
    all.pop_back();
    std::cout << "end\\n";
}`,
    options: [
      { text: 'Beep\nWoof\n~Dog\n~Speaker\nend\n~Speaker', correct: true, why: 'Each call dispatches to the real object\'s override. `pop_back` destroys the `Dog` through a `Speaker*`; the virtual destructor runs `~Dog`, then `~Speaker`. The `Robot` dies when `all` does.' },
      { text: 'Beep\nWoof\n~Speaker\nend\n~Speaker', correct: false, why: 'Because `~Speaker` is virtual, destroying through a `Speaker*` starts at the most-derived destructor, `~Dog`. Only a non-virtual destructor would skip it (undefined behaviour).' },
      { text: 'Beep\nWoof\n~Speaker\n~Dog\nend\n~Speaker', correct: false, why: 'Destruction runs from the most-derived class down: `~Dog`\'s body runs first, then the base subobject is destroyed with `~Speaker`.' },
      { text: 'Beep\nWoof\n~Dog\n~Speaker\nend', correct: false, why: 'The `Robot` is still owned by the vector. When `all` is destroyed at the end of `main`, its `unique_ptr` deletes the `Robot`, whose implicit destructor calls `~Speaker`.' },
      { text: 'Compilation error', correct: false, why: 'The vector stores `unique_ptr<Speaker>`, i.e. pointers to an abstract class, which is allowed. Only `Robot` and `Dog` objects are created, and both are concrete.' },
    ],
    explanation: `This is the everyday use of an interface: own concrete objects through **pointers to the abstract base** and call them uniformly. \`s->speak()\` is a virtual call, so it reaches \`Robot::speak\` or \`Dog::speak\`; the pure \`Speaker::speak\` is never the target.

Destruction goes through the base pointer too. Because \`~Speaker\` is virtual, \`delete\` (here inside \`unique_ptr\`) starts at \`~Dog\` and then destroys the \`Speaker\` part. The vector destroys the remaining \`Robot\` when \`main\` ends, after "end" is printed.`,
  },
  {
    id: 'abstraction-q07', lang: 'python', type: 'compare', difficulty: 2,
    prompt: 'You need a `Drawable` interface in Python. How does `class Drawable(ABC)` with an `@abstractmethod def draw(self)` compare with `class Drawable(Protocol)` declaring `def draw(self) -> str: ...`?',
    options: [
      { text: 'The ABC is **nominal**: only classes that inherit it (or are `register`ed) count, and an incomplete subclass fails at instantiation. The Protocol is **structural**: for a static type checker, any class with a matching `draw` qualifies, with no inheritance.', correct: true, why: 'ABCs ask "did you declare that you are one?" and enforce it when an object is created; Protocols ask "do you have the right shape?" and are checked by tools such as mypy and pyright.' },
      { text: 'They are equivalent: `Protocol` is simply the newer spelling of `ABC`.', correct: false, why: 'They answer different questions. A class without `Drawable` in its bases is never an instance of the ABC, yet it can satisfy the Protocol just by having `draw`.' },
      { text: 'The interpreter enforces the Protocol: passing an object without `draw()` to a parameter annotated `Drawable` raises `TypeError` at the call.', correct: false, why: 'Python does not check annotations at run time. The call goes ahead and fails later, inside the function, with `AttributeError`. Only a static type checker reports it in advance.' },
      { text: 'It is the other way round: ABCs are only checked by type checkers, while Protocols are enforced by the interpreter.', correct: false, why: 'ABC enforcement is a run-time check in `ABCMeta`, at instantiation. A Protocol is a static-typing construct; at run time it only supports `isinstance`, and only with `@runtime_checkable`.' },
      { text: 'Both require the implementing class to list the interface among its bases; Protocols just add stricter signature checks.', correct: false, why: 'Inheriting a Protocol is allowed but never required: matching members are enough. That is exactly what makes it structural.' },
    ],
    explanation: `**Nominal** typing: a class is a \`Drawable\` because it *says so* (it inherits the ABC). You get run-time enforcement at instantiation and can share concrete helper methods in the base.

**Structural** typing: a class is a \`Drawable\` because it *has* \`draw()\`. That fits classes you cannot modify (third-party code, built-ins) and keeps modules decoupled, but the checking is done by static type checkers, not by the interpreter. Choose an ABC for a family you own; choose a Protocol to accept "anything that fits".`,
  },
  {
    id: 'abstraction-q08', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from typing import Protocol, runtime_checkable


@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...


class File:
    def close(self) -> None:
        print("file closed")


class Door:
    def close(self, force: bool, reason: str) -> str:
        return "slam"


class Window:
    def open(self) -> None: ...


print(isinstance(File(), Closeable))
print(isinstance(Door(), Closeable))
print(isinstance(Window(), Closeable))
print(Closeable in File.__mro__)`,
    options: [
      { text: 'True\nTrue\nFalse\nFalse', correct: true, why: '`isinstance` with a runtime-checkable Protocol only checks that a member named `close` exists. `Door` has one (with the wrong signature), `Window` does not, and no class inherits `Closeable`.' },
      { text: 'True\nFalse\nFalse\nFalse', correct: false, why: 'The run-time check does not compare signatures or return types: `Door.close` takes two extra parameters and still passes. Only a static type checker would flag it.' },
      { text: 'False\nFalse\nFalse\nFalse', correct: false, why: 'That would be nominal typing. A Protocol is structural: `File` never mentions `Closeable`, yet it qualifies because it has a `close` member.' },
      { text: 'True\nTrue\nFalse\nTrue', correct: false, why: 'A structural match does not change the class. `File.__mro__` is still `(File, object)`; `isinstance` simply answered by inspecting members.' },
      { text: 'TypeError', correct: false, why: 'That happens when `isinstance` is used with a Protocol that is *not* decorated with `@runtime_checkable`. Here the decorator is present.' },
    ],
    explanation: `\`@runtime_checkable\` lets a Protocol be used with \`isinstance\`, but the check is shallow: it verifies that every protocol member **exists** on the object, nothing about parameters or return types. \`Door\` passes even though calling \`door.close()\` would fail with a \`TypeError\` (missing arguments).

Treat run-time Protocol checks as a cheap "does it look right?" filter. Real conformance, signatures included, is verified by a static type checker. And because the match is structural, the Protocol never appears in the class's MRO.`,
  },
  {
    id: 'abstraction-q09', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Why should `Logger` declare `virtual ~Logger() = default;`?',
    codeLang: 'cpp',
    code: `#include <string>

class Logger {
public:
    virtual void log(const std::string& msg) = 0;
    // no virtual destructor
};

class FileLogger : public Logger {
public:
    ~FileLogger() { /* flush buffers, close the file */ }
    void log(const std::string& msg) override { /* buffer msg */ }
};

void shutdown(Logger* lg) { delete lg; }   // shutdown(new FileLogger);`,
    options: [
      { text: 'Deleting a `FileLogger` through a `Logger*` whose destructor is not virtual is undefined behaviour; typically `~FileLogger` never runs and the file is never flushed. A virtual destructor makes `delete` start at the most-derived destructor.', correct: true, why: 'Interfaces are used through base pointers, so objects are also destroyed through them. Only a virtual destructor lets `delete` find the real type.' },
      { text: 'It is not needed: having pure virtual functions already makes every member function virtual, the destructor included.', correct: false, why: '`virtual` is a property of each function. Unless declared (or inherited from a base with a virtual destructor), the destructor is non-virtual, however many pure virtuals the class has.' },
      { text: 'It is only needed when `Logger` has data members; an interface with no data has nothing to destroy.', correct: false, why: 'The danger is the *derived* part: `FileLogger`\'s destructor and members. `Logger` having no data of its own does not help.' },
      { text: 'Nothing goes wrong at run time, because the compiler rejects `delete lg;` with an error.', correct: false, why: 'It compiles. GCC only warns (`-Wdelete-non-virtual-dtor`, in `-Wall`): *deleting object of abstract class type \'Logger\' which has non-virtual destructor will cause undefined behavior*.' },
      { text: 'Only raw `delete` is affected; a `std::unique_ptr<Logger>` always calls the right destructor.', correct: false, why: '`unique_ptr<Logger>`\'s default deleter performs exactly `delete p` on a `Logger*`, with the same undefined behaviour.' },
    ],
    explanation: `\`delete p\` uses the **static** type of \`p\` to find the destructor unless that destructor is virtual (Module 06). For an interface, objects are almost always owned and destroyed through the interface pointer, so the rule is simple: give every interface a public virtual destructor, usually \`virtual ~Logger() = default;\`.

The C++ Core Guidelines (C.35) phrase it as: a base class destructor should be either public and virtual, or protected and non-virtual (the latter forbids deleting through the base at all).`,
  },
  {
    id: 'abstraction-q10', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: '`Base::reset` is pure virtual **and** has a definition. Which statement is true?',
    codeLang: 'cpp',
    code: `struct Base {
    virtual ~Base() = default;
    virtual void reset() = 0;
};

void Base::reset() { /* shared default steps */ }`,
    options: [
      { text: 'It is legal. `Base` stays abstract, every concrete subclass must still override `reset()`, and an override may run the shared body with the qualified call `Base::reset()`.', correct: true, why: '`= 0` means "subclasses must override", not "there is no code". A qualified call names the function directly, bypassing virtual dispatch.' },
      { text: 'It does not compile: a pure virtual function cannot have a definition.', correct: false, why: 'It can, as long as the definition is written outside the class. Only `= 0 { ... }` inside the class body is rejected.' },
      { text: 'Providing the body makes `Base` concrete, so `Base b;` now compiles.', correct: false, why: 'Abstractness comes from the pure-specifier, not from a missing body. `Base` is abstract with or without the definition.' },
      { text: 'A subclass that does not override `reset()` is concrete and uses this body as its implementation.', correct: false, why: 'Such a subclass is abstract too: it inherits a pure virtual function it has not overridden. The body is never a fallback for virtual calls.' },
      { text: 'The body runs on a virtual call `p->reset()` whenever `p` points to a `Base` object.', correct: false, why: 'There is never a complete `Base` object, because `Base` is abstract. A virtual call on a finished object always reaches an override.' },
    ],
    explanation: `A pure virtual function may have a definition, written outside the class. The class is still abstract and subclasses still must override it, but they can reuse the shared part:

~~~cpp
struct Derived : Base {
    void reset() override {
        Base::reset();   // qualified: runs the base body directly
        /* Derived-specific steps */
    }
};
~~~

This gives a "default you must opt into explicitly". The best-known case is a pure virtual destructor, which *must* have a definition because every derived destructor calls it.`,
  },
  {
    id: 'abstraction-q11', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

class Report {
public:
    virtual ~Report() = default;
    virtual std::string header() const = 0;
    std::string render() const { return header() + "|body"; }
};

std::string Report::header() const { return "REPORT"; }

class Sales : public Report {
public:
    std::string header() const override { return Report::header() + ":sales"; }
};

class Audit : public Report {
public:
    std::string header() const override { return "AUDIT"; }
};

int main() {
    Sales s;
    Audit a;
    const Report& r = s;
    std::cout << r.render() << '\\n';
    std::cout << a.render() << '\\n';
    std::cout << s.Report::header() << '\\n';
}`,
    options: [
      { text: 'REPORT:sales|body\nAUDIT|body\nREPORT', correct: true, why: '`render` calls `header()` virtually, reaching each override. `Sales` opts into the base body with `Report::header()`; `Audit` does not. The qualified call `s.Report::header()` runs the body directly.' },
      { text: 'REPORT|body\nREPORT|body\nREPORT', correct: false, why: 'Giving a pure virtual a body does not make it the target of virtual calls. `header()` inside `render` dispatches to `Sales::header` or `Audit::header`.' },
      { text: 'REPORT:sales|body\nAUDIT|body\nREPORT:sales', correct: false, why: 'A qualified name like `s.Report::header()` turns off virtual dispatch and calls exactly `Report::header`, even on a `Sales` object.' },
      { text: 'Compilation error: a pure virtual function cannot have a body', correct: false, why: 'A pure virtual function may be defined outside its class. Only writing the body inside the class together with `= 0` is an error.' },
      { text: 'Compilation error: `s.Report::header()` calls a pure virtual function', correct: false, why: 'Calling a pure virtual by qualified name is allowed as long as it has a definition; here it does, so the call compiles, links and runs.' },
    ],
    explanation: `Two kinds of call meet here. An **unqualified** call such as \`header()\` inside \`render()\` is virtual: it goes to the override of the actual object. A **qualified** call such as \`Report::header()\` names one specific function and is never virtual, which is the only way the body of a pure virtual function can run (apart from destructors, which are chained automatically).

So the body acts as an opt-in default: \`Sales\` reuses it, \`Audit\` ignores it, and both are still forced to write an override because \`header\` is pure.`,
  },
  {
    id: 'abstraction-q12', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'This interface lets the app keep users in SQLite in production and in a plain dict in tests (the C++ version would be an abstract class with the same members). Which member makes it a **leaky abstraction**?',
    codeLang: 'python',
    code: `import sqlite3
from abc import ABC, abstractmethod


class UserStore(ABC):
    @abstractmethod
    def find(self, user_id: int) -> "User | None": ...

    @abstractmethod
    def save(self, user: "User") -> None: ...

    @abstractmethod
    def cursor(self) -> sqlite3.Cursor: ...

    @abstractmethod
    def count(self) -> int: ...`,
    options: [
      { text: '`cursor()`: it exposes the SQLite implementation, so callers become tied to SQL and the in-memory store cannot honestly implement it.', correct: true, why: 'A member that only makes sense for one implementation leaks the *how* through the *what*. The dict-based store would have to fake a database cursor or raise.' },
      { text: '`find()`: returning `None` for a missing user reveals that lookups can fail.', correct: false, why: '"The user may not exist" is part of *what* a store does, and every implementation can report it. Leaks are about exposing *how* it is done.' },
      { text: '`count()`: an interface should only contain operations that change state.', correct: false, why: 'There is no such rule. Queries are normal interface members, and both a database and a dict can count users naturally.' },
      { text: '`save()`: taking a whole `User` object exposes that class\'s fields to every store.', correct: false, why: '`User` is the domain type the store exists to hold; it is part of the contract, not an implementation detail of one storage engine.' },
    ],
    explanation: `An abstraction **leaks** when its interface exposes details of one implementation: a database cursor, a file handle, a \`flushToDisk()\` on a logger. Callers start depending on those details, and other implementations either fake them or throw.

A useful test for every member: *would every reasonable implementation provide this naturally?* If not, move it into the concrete class (\`SqliteUserStore\`) where only code that really needs SQL can reach it.`,
  },
  {
    id: 'abstraction-q13', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'You want `PaymentMethod` to have an **abstract read-only property** `name`, so that a subclass that does not provide `name` cannot be instantiated. Which definition does that?',
    options: [
      { text: '`@property` on top, then `@abstractmethod` directly above `def name(self) -> str: ...`, in a class that inherits `ABC`.', correct: true, why: '`@abstractmethod` must be the innermost decorator: it marks the function, and `property` then reports itself as abstract, so `ABCMeta` counts `name` as unimplemented.' },
      { text: '`@abstractmethod` on top, then `@property`.', correct: false, why: 'The order matters: `abstractmethod` would try to set `__isabstractmethod__` on the property object, which is read-only. Class creation fails with `AttributeError`.' },
      { text: '`@abc.abstractproperty`, the modern spelling.', correct: false, why: '`abstractproperty` is the *old* spelling, deprecated since Python 3.3. Stacking `@property` over `@abstractmethod` replaced it.' },
      { text: 'A bare annotation in the class body: `name: str`.', correct: false, why: 'Annotations are not checked by `ABCMeta`. A subclass without `name` instantiates fine and fails only when `name` is read (`AttributeError`).' },
      { text: '`@property` alone, with a body that raises `NotImplementedError`.', correct: false, why: 'That is a run-time placeholder: subclasses that forget `name` can still be instantiated and fail only when the property is read.' },
    ],
    explanation: `Stack the decorators with \`@abstractmethod\` innermost:

~~~python
class PaymentMethod(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...
~~~

A subclass satisfies it with anything named \`name\` that is not itself abstract: a property, or even a plain class attribute such as \`name = "cash"\`. The same innermost rule applies to \`@classmethod\` and \`@staticmethod\`.`,
  },
  {
    id: 'abstraction-q14', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'C++20 **concepts** and Python **`typing.Protocol`** are both structural: a type qualifies by having the right members, not by inheriting. What is the key difference?',
    options: [
      { text: 'The compiler enforces a concept: calling a constrained template with a non-conforming type is a compile error, and each type gets its own instantiation with no vtable. A Protocol is checked only by external type checkers; the interpreter runs non-conforming calls anyway.', correct: true, why: 'Both describe "the right shape", but a concept is part of the C++ language rules, while a Protocol is an annotation the interpreter ignores.' },
      { text: 'A type must inherit from a concept to satisfy it, while Protocols need no inheritance.', correct: false, why: 'A concept is not a class and cannot be inherited. Any type whose expressions satisfy its `requires` clause qualifies automatically.' },
      { text: 'Both are checked at run time: a concept is tested each time the constrained function is called.', correct: false, why: 'Concepts are evaluated during compilation, when the template is instantiated. They add no run-time checks or cost.' },
      { text: 'With a concept you can store different conforming types in one `std::vector<Drawable>`, like a list of Protocol objects.', correct: false, why: 'A concept is a compile-time predicate, not a type, so `std::vector<Drawable>` is meaningless. A container of mixed types needs a common abstract base (or type erasure).' },
      { text: 'There is none once you add `@runtime_checkable`: `isinstance` then verifies signatures and return types, just like a concept.', correct: false, why: '`@runtime_checkable` only checks that members with the right names exist. Signatures are checked by static type checkers, never at run time.' },
    ],
    explanation: `Structural typing means "if it has the right members, it fits". C++20 concepts make the compiler check that when a template is used, producing a (fairly) readable error such as *constraints not satisfied*, and every conforming type gets its own specialised code. Python Protocols express the same idea for mypy or pyright; at run time nothing is enforced.

In C++ a concept does not replace an abstract base when **one** variable or container must hold objects of different types chosen at run time (short of type erasure). In Python a Protocol does: a \`list[Drawable]\` holds any conforming objects, and calls on them dispatch normally. Module 15 covers concepts and Python generics in depth.`,
  },
  {
    id: 'abstraction-q15', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Version A of `OrderService` creates and owns a `ConsoleLogger log_;` member. Version B (below) receives a `Logger&`, an interface, in its constructor. Why is B much easier to unit-test?',
    codeLang: 'cpp',
    code: `class OrderService {
public:
    explicit OrderService(Logger& log) : log_(log) {}
    bool placeOrder(const std::string& item, int qty);   // logs what happened
private:
    Logger& log_;   // any implementation of the Logger interface
};`,
    options: [
      { text: 'A test can inject a fake, e.g. a `MemoryLogger` that records each line, and then assert on the recorded lines: no console capture and no change to `OrderService`.', correct: true, why: 'B depends on the role (`Logger`), not on a concrete class, so the caller decides which implementation it gets: the console in production, a recorder in tests.' },
      { text: 'Virtual calls through a reference are faster than direct calls, so the tests run sooner.', correct: false, why: 'A virtual call is never cheaper than a direct one. The benefit of B is substitutability, not speed.' },
      { text: 'Because `log_` is a reference, test code can access it from outside the class.', correct: false, why: 'Access control does not depend on whether a member is a reference: `log_` is still private. The test keeps its own reference to the fake it passed in.' },
      { text: 'There is no real difference: a C++ test can swap `ConsoleLogger` for another class at run time with either version.', correct: false, why: 'C++ cannot monkey-patch: version A hard-codes `ConsoleLogger` at compile time, so a test can only capture `std::cout` and parse it.' },
    ],
    explanation: `This is **dependency injection**: instead of creating its collaborators, a class receives them from outside, typed as small interfaces. The service now depends on an abstraction, so you can pass a test double, a file logger, or a logger that forwards to a monitoring system, all without editing \`OrderService\`.

Module 18 names the principles behind it: **dependency inversion** (high-level code depends on abstractions, not on concrete details) and **interface segregation** (keep those abstractions small and role-based).`,
  },
  {
    id: 'abstraction-q16', lang: 'python', type: 'bug', difficulty: 2,
    prompt: 'The author expected `CsvExporter()` to raise `TypeError`, because `export` is abstract and `CsvExporter` does not implement it. Instead the program runs and prints `None`. What is the bug?',
    codeLang: 'python',
    code: `from abc import abstractmethod


class Exporter:
    @abstractmethod
    def export(self, data): ...


class CsvExporter(Exporter):
    def header(self):
        return "id,name"


e = CsvExporter()         # expected: TypeError
print(e.export([1, 2]))   # prints None`,
    options: [
      { text: '`Exporter` does not inherit from `ABC` (or use `metaclass=ABCMeta`). `@abstractmethod` only marks the function; `ABCMeta` collects the marked names into `__abstractmethods__`, and `object.__new__` refuses instantiation when that set is non-empty. Fix: `class Exporter(ABC):`.', correct: true, why: 'The decorator just sets `export.__isabstractmethod__ = True`. Without `ABCMeta`, nobody reads that flag and `__abstractmethods__` is never filled in, so incomplete subclasses instantiate normally.' },
      { text: '`abstractmethod` must be imported from `typing`, not from `abc`.', correct: false, why: '`abstractmethod` lives in the `abc` module, and the import works. The decorator is fine; what is missing is the metaclass that enforces it.' },
      { text: 'The abstract method needs `raise NotImplementedError` as its body instead of `...`.', correct: false, why: 'The body of an abstract method is irrelevant to enforcement. Raising would only turn the silent `None` into an error when `export` is *called*, not at instantiation.' },
      { text: 'Abstract methods are only enforced on the class that declares them, never on its subclasses.', correct: false, why: 'It is the reverse: subclasses are exactly what ABCs check. Here not even `Exporter()` would be refused, because nothing enforces the marker at all.' },
    ],
    explanation: `\`@abstractmethod\` does nothing by itself: it sets \`__isabstractmethod__ = True\` on the function. \`ABCMeta\`, the metaclass behind \`ABC\`, reads those markers when each class is created, and stores the unimplemented names in \`__abstractmethods__\`; \`object.__new__\` then refuses to instantiate any class whose set is non-empty.

~~~python
from abc import ABC, abstractmethod

class Exporter(ABC):          # now CsvExporter() raises TypeError
    @abstractmethod
    def export(self, data): ...
~~~

Python raises no error or warning for this mistake, so make "inherits \`ABC\`" a reflex whenever you write \`@abstractmethod\`.`,
  },
];
