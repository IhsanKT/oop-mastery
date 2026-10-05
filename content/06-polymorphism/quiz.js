export default [
  {
    id: 'polymorphism-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'A loop calls `animal->speak()` (C++, `speak` is `virtual`) or `animal.speak()` (Python) on every element of a collection holding dogs, cats and parrots. What does **dynamic dispatch** mean here?',
    options: [
      { text: 'The implementation of `speak` is chosen at **run time**, from the actual type of the object being called on, not from the declared type of the variable or pointer.', correct: true, why: 'Right. The same call site runs `Dog`\'s, `Cat`\'s or `Parrot`\'s `speak` depending on which object it reaches on that iteration.' },
      { text: 'The compiler chooses the implementation from the declared type of `animal`, so every element runs the base version.', correct: false, why: 'That is *static* binding, which C++ uses for non-virtual functions. Dynamic dispatch exists precisely to look past the declared type.' },
      { text: 'The objects are allocated dynamically (with `new`), which lets them change type while the program runs.', correct: false, why: 'Dynamic allocation and dynamic dispatch are unrelated. An object never changes its type; dispatch uses the type it was created with.' },
      { text: 'Each subclass\'s `speak` is tried in turn until one of them accepts the object.', correct: false, why: 'There is no trial and error: one lookup (a vtable slot in C++, the class\'s MRO in Python) finds the single right function directly.' },
      { text: 'Every object is first converted to the base type, so that all of them behave the same way.', correct: false, why: 'Converting to the base type by value is *slicing*, which destroys the derived behavior. Dispatch works on the original objects through references or pointers.' },
    ],
    explanation: `**Dynamic dispatch** (late binding) means the function that runs is selected at run time from the object's **dynamic type**: the class it was actually created as. This is what makes one loop work for every kind of animal, including kinds written after the loop.

Python dispatches every method call this way. C++ does it only for \`virtual\` functions called through a pointer or reference; everything else is bound at compile time from the **static type**.`,
  },
  {
    id: 'polymorphism-q02', lang: 'cpp', type: 'output', difficulty: 1,
    prompt: 'What does this program print? Note that `sound` is virtual and `kind` is not.',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

struct Animal {
    virtual ~Animal() = default;
    virtual std::string sound() const { return "..."; }
    std::string kind() const { return "animal"; }
};

struct Dog : Animal {
    std::string sound() const override { return "Woof"; }
    std::string kind() const { return "dog"; }
};

int main() {
    Dog rex;
    const Animal& a = rex;
    std::cout << a.sound() << " " << a.kind() << "\\n";
    std::cout << rex.sound() << " " << rex.kind() << "\\n";
}`,
    options: [
      { text: 'Woof animal\nWoof dog', correct: true, why: 'Through `a`, the virtual `sound` follows the dynamic type (`Dog`) while the non-virtual `kind` follows the static type (`Animal`). Through `rex`, both types are `Dog`.' },
      { text: 'Woof dog\nWoof dog', correct: false, why: 'Only virtual functions are dispatched dynamically. `Dog::kind` merely *hides* `Animal::kind`, so a call through an `Animal&` still picks `Animal::kind`.' },
      { text: '... animal\nWoof dog', correct: false, why: 'A reference does not copy or slice: `a` refers to the `Dog` object itself, so the virtual call reaches `Dog::sound`.' },
      { text: 'Compilation error: Dog::kind must be marked override', correct: false, why: '`override` is optional, and it is only *allowed* on functions that override a virtual one. `kind` is not virtual, so `override` there would be the error.' },
    ],
    explanation: `Each call is resolved one of two ways:

- **Virtual function, called through a reference or pointer:** the object's dynamic type decides, so \`a.sound()\` runs \`Dog::sound\`.
- **Non-virtual function:** the static type of the expression decides at compile time, so \`a.kind()\` runs \`Animal::kind\`, even though the object is a \`Dog\`.

Calls on \`rex\` itself are unambiguous: its static and dynamic types are both \`Dog\`. A derived function with the same name as a non-virtual base function only hides it (Module 05); it never takes part in dispatch.`,
  },
  {
    id: 'polymorphism-q03', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print? The three functions differ only in how they take their parameter.',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

struct Animal {
    virtual ~Animal() = default;
    virtual std::string sound() const { return "..."; }
};

struct Dog : Animal {
    std::string sound() const override { return "Woof"; }
};

void byValue(Animal a)       { std::cout << a.sound() << " "; }
void byRef(const Animal& a)  { std::cout << a.sound() << " "; }
void byPtr(const Animal* a)  { std::cout << a->sound() << "\\n"; }

int main() {
    Dog d;
    byValue(d);
    byRef(d);
    byPtr(&d);
}`,
    options: [
      { text: '... Woof Woof', correct: true, why: '`byValue` receives a sliced copy that really is an `Animal`. The reference and the pointer refer to the original `Dog`, so the virtual call reaches `Dog::sound`.' },
      { text: 'Woof Woof Woof', correct: false, why: '`virtual` cannot rescue a sliced copy. The parameter is a brand-new `Animal` object (with `Animal`\'s vptr), so there is no `Dog` left to dispatch to.' },
      { text: '... ... Woof', correct: false, why: 'References dispatch exactly like pointers. `const Animal&` binds to the `Dog` object without copying it.' },
      { text: '... ... ...', correct: false, why: 'Only the by-value parameter is a separate `Animal`. The reference and pointer calls see the dynamic type `Dog`.' },
      { text: "Compilation error: a Dog cannot be copied into an Animal", correct: false, why: "It compiles: `Animal`'s copy constructor takes `const Animal&`, which binds to the `Animal` part of `d`. That silent conversion is exactly how slicing happens." },
    ],
    explanation: `Passing **by value** constructs a new \`Animal\` from the \`Animal\` part of \`d\`. That object's dynamic type is \`Animal\`: its vptr was set by \`Animal\`'s constructor, so even a virtual call runs \`Animal::sound\`. The \`Dog\` part was never copied.

Passing by **reference** or **pointer** keeps the original object, and the virtual call is dispatched on its dynamic type. Rule of thumb: take polymorphic objects as \`const Base&\`, \`Base&\` or \`Base*\`, never as \`Base\`.`,
  },
  {
    id: 'polymorphism-q04', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: 'This program prints `0` instead of the circle\'s area. What is the bug, and what is the best fix?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <memory>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0; }
};

class Circle : public Shape {
public:
    explicit Circle(double r) : r_(r) {}
    virtual double area() { return 3.14159 * r_ * r_; }
private:
    double r_;
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>(1.0));
    for (const auto& s : shapes) std::cout << s->area() << "\\n";   // prints 0
}`,
    options: [
      { text: '`Circle::area` is missing `const`, so its signature differs: it declares a new virtual function that hides `Shape::area` instead of overriding it. Write `double area() const override`; with `override`, the mistake becomes a compile error.', correct: true, why: 'The `const` on a member function is part of its signature. `Shape::area() const` still has only its own implementation, and that is what the call through `Shape*` reaches.' },
      { text: '`s` is a `const` reference, which forces the base version; write `for (auto& s : shapes)`.', correct: false, why: 'A `const std::unique_ptr<Shape>` still points to a non-const `Shape`, and `s->area()` is dispatched normally. The problem is that `Circle` never overrode `Shape::area() const`.' },
      { text: '`std::unique_ptr` calls member functions non-virtually; store raw `Shape*` pointers instead.', correct: false, why: '`s->area()` goes through the `Shape*` that the smart pointer holds, so dispatch works exactly as with a raw pointer.' },
      { text: '`Shape::area` should also be marked `override`, so that both declarations are linked.', correct: false, why: '`override` in the base is a compile error, because `Shape::area` overrides nothing. `override` belongs on the derived function, where it checks the match.' },
    ],
    explanation: `An override must match the base function's name, parameter types and **cv/ref-qualifiers** exactly. \`double area()\` and \`double area() const\` are different functions, so \`Circle\` gained a second, unrelated virtual function and hid the base one. A call through \`Shape*\` looks for an override of \`Shape::area() const\` and finds none, so the base version returns 0.

GCC 14 with \`-Wall\` at least warns: *'virtual double Shape::area() const' was hidden*. Writing \`double area() override\` turns it into a hard error: *'double Circle::area()' marked 'override', but does not override*. Mark every override with \`override\` and this whole class of bug disappears.`,
  },
  {
    id: 'polymorphism-q05', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What exactly does the compiler check when a member function is declared with `override`?',
    options: [
      { text: 'That the function really overrides a virtual function of a base class: same name, same parameter types, same `const`/`volatile` and reference qualifiers, and a compatible return type. Otherwise compilation fails.', correct: true, why: 'That is the whole job of `override`: turn a silent signature mismatch into a compile error. It changes nothing in the generated code.' },
      { text: 'That the overridden base function is `public`, so that outside code can call it.', correct: false, why: 'Access is not part of overriding. A derived class may override a `private` virtual function (the non-virtual interface idiom relies on this).' },
      { text: 'That every virtual function of the base class has been overridden.', correct: false, why: '`override` checks one function only. Whether a class still has unimplemented *pure* virtual functions (making it abstract) is a separate rule, covered in Module 07.' },
      { text: 'It makes the function virtual, even when the base version is not, so that dispatch works through base pointers.', correct: false, why: 'If the base function is not virtual, there is nothing to override and `override` is an error: *marked \'override\', but does not override*.' },
      { text: 'Nothing at compile time; it is a run-time hint that makes virtual calls faster.', correct: false, why: '`override` is purely a compile-time check with zero run-time effect. (`final` can help the optimizer devirtualize calls, but that is a different keyword.)' },
    ],
    explanation: `\`override\` is a contextual keyword placed after the parameter list. It asserts "this function overrides a base-class virtual function", and the compiler verifies it. A function overrides only if the name, parameter types and \`const\`/\`volatile\`/reference qualifiers all match; the return type must then be the same or *covariant* (a pointer or reference to a derived class).

Without \`override\`, a typo such as a missing \`const\`, \`int\` instead of \`long\`, or a misspelled name quietly creates a new function. C++ Core Guidelines: write \`virtual\` only on the base declaration and \`override\` (or \`final\`) on every override.`,
  },
  {
    id: 'polymorphism-q06', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print? `name()` is virtual and is called from constructors, destructors and a non-virtual member function.',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

struct Widget {
    Widget() { std::cout << "build " << name() << "\\n"; }
    virtual ~Widget() { std::cout << "destroy " << name() << "\\n"; }
    virtual std::string name() const { return "Widget"; }
    void show() const { std::cout << "show " << name() << "\\n"; }
};

struct Button : Widget {
    Button() { std::cout << "build " << name() << "\\n"; }
    ~Button() override { std::cout << "destroy " << name() << "\\n"; }
    std::string name() const override { return "Button"; }
};

int main() {
    Button b;
    b.show();
}`,
    options: [
      { text: 'build Widget\nbuild Button\nshow Button\ndestroy Button\ndestroy Widget', correct: true, why: 'Inside `Widget()` and `~Widget()` the object behaves as a `Widget`, because its `Button` part does not exist yet (or any more). In between, it is a full `Button`.' },
      { text: 'build Button\nbuild Button\nshow Button\ndestroy Button\ndestroy Button', correct: false, why: 'A virtual call during construction cannot reach `Button::name`: `Button`\'s members are not initialized yet, so C++ dispatches to the class whose constructor is running.' },
      { text: 'build Widget\nbuild Button\nshow Widget\ndestroy Button\ndestroy Widget', correct: false, why: '`show` is non-virtual, but the call to `name()` *inside* it goes through `this` and is virtual, so it reaches `Button::name` once construction has finished.' },
      { text: 'build Widget\nbuild Button\nshow Button\ndestroy Button\ndestroy Button', correct: false, why: 'By the time `~Widget` runs, `~Button` has already finished and the `Button` part is gone, so the call in `~Widget` dispatches to `Widget::name`.' },
      { text: 'build Button\nbuild Widget\nshow Button\ndestroy Widget\ndestroy Button', correct: false, why: 'The base is constructed first and destroyed last (Module 05). The order of the messages follows the constructors and destructors, not the virtual calls.' },
    ],
    explanation: `During construction, an object's dynamic type is the class **whose constructor is currently running**. While \`Widget()\` runs, the \`Button\` part is not built yet, so a virtual call resolves to \`Widget::name\`; in the usual implementation, \`Widget\`'s constructor points the vptr at \`Widget\`'s vtable, and \`Button\`'s constructor re-points it at \`Button\`'s. Destruction mirrors this: once \`~Button\` has finished, the object is a \`Widget\` again.

This rule protects you from calling a method that uses members which do not exist yet. Python has no such protection: a base \`__init__\` calling \`self.name()\` runs the subclass override immediately. Calling a *pure* virtual function this way in C++ is undefined behavior, so avoid virtual calls in constructors and destructors altogether.`,
  },
  {
    id: 'polymorphism-q07', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does the C++ standard say about the `delete p;` line?',
    codeLang: 'cpp',
    code: `#include <fstream>
#include <string>

class Logger {
public:
    virtual void log(const std::string& msg) { /* ... */ }
    ~Logger() { /* ... */ }                     // not virtual
};

class FileLogger : public Logger {
public:
    void log(const std::string& msg) override { file_ << msg << '\\n'; }
private:
    std::ofstream file_{"app.log"};
};

void run() {
    Logger* p = new FileLogger;
    p->log("start");
    delete p;
}`,
    options: [
      { text: 'It is **undefined behavior**: `p`\'s static type `Logger` differs from the dynamic type `FileLogger`, and `Logger` has no virtual destructor. Typically `~FileLogger` (and `file_`\'s destructor) is skipped, but nothing at all is guaranteed.', correct: true, why: 'This is the precise rule. "Only the base destructor runs" is a common outcome, not a promise: the standard places no requirements on the program.' },
      { text: 'It is fine: `log` is virtual, which makes the destructor virtual too, so `~FileLogger` runs first.', correct: false, why: 'Each function is virtual only if declared so (or if it overrides a virtual one). Other virtual functions do not make the destructor virtual.' },
      { text: 'It is well defined: `~Logger` runs and `file_` simply leaks.', correct: false, why: 'There is no defined "leak" outcome. Deleting a derived object through a base pointer without a virtual destructor is undefined behavior, whatever happens to occur in practice.' },
      { text: 'It does not compile: `delete` on a base pointer requires a virtual destructor.', correct: false, why: 'It compiles. GCC\'s `-Wdelete-non-virtual-dtor` (in `-Wall`) may warn, but the language does not forbid it, which is why the rule must be learned.' },
      { text: 'It is safe as long as `FileLogger` does not declare a destructor of its own.', correct: false, why: '`FileLogger` still has an implicit destructor that must destroy `file_`. And even with nothing to clean up, the rule does not make an exception: it is undefined behavior.' },
    ],
    explanation: `When \`delete\` is applied to a base-class pointer whose object is actually of a derived type, the base class **must** have a virtual destructor; otherwise the behavior is undefined. A virtual destructor makes \`delete p\` dispatch to \`~FileLogger\`, which runs first and then automatically calls \`~Logger\`.

The fix is one line: \`virtual ~Logger() = default;\`. The same applies to \`std::unique_ptr<Logger>\`, whose default deleter calls \`delete\` on a \`Logger*\`. You can check it with \`static_assert(std::has_virtual_destructor_v<Logger>);\`. The rule: a polymorphic base gets a public virtual destructor, or a protected non-virtual one if it must never be deleted through a base pointer.`,
  },
  {
    id: 'polymorphism-q08', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print? `Base` has a **virtual** destructor.',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <memory>

struct Base {
    virtual ~Base() { std::cout << "~Base "; }
};

struct Derived : Base {
    ~Derived() override { std::cout << "~Derived "; }
};

int main() {
    Base* p = new Derived;
    delete p;
    std::cout << "| ";
    std::unique_ptr<Base> q = std::make_unique<Derived>();
    q.reset();
    std::cout << "end\\n";
}`,
    options: [
      { text: '~Derived ~Base | ~Derived ~Base end', correct: true, why: 'The virtual destructor dispatches to `~Derived`, which then calls `~Base` automatically. `reset()` destroys the object immediately, before `end` is printed.' },
      { text: '~Base | ~Base end', correct: false, why: 'Because `~Base` is virtual, `delete` through a `Base*` dispatches on the dynamic type and starts with `~Derived`.' },
      { text: '~Base ~Derived | ~Base ~Derived end', correct: false, why: 'Destruction runs from the most derived class down to the base, the reverse of construction.' },
      { text: '~Derived | ~Derived end', correct: false, why: 'An overriding destructor does not *replace* the base destructor. After its body, `~Derived` always calls `~Base` (and the other subobject destructors).' },
      { text: '~Derived ~Base | end ~Derived ~Base', correct: false, why: '`q.reset()` deletes the owned object right away; it does not wait for `q` to go out of scope. After `reset()`, `q` is empty and its destructor does nothing.' },
    ],
    explanation: `A virtual destructor makes destruction polymorphic: \`delete p\` looks up the destructor of the *dynamic* type, runs \`~Derived\`'s body, and then the bases are destroyed in reverse order of construction. \`std::unique_ptr<Base>\` relies on exactly the same mechanism, because its deleter calls \`delete\` on a \`Base*\`.

Note that \`~Derived() override\` is legal: a destructor overrides a virtual base destructor even though the names differ. Writing \`override\` there documents that the base destructor is virtual and fails to compile if it is not.`,
  },
  {
    id: 'polymorphism-q09', lang: 'python', type: 'output', difficulty: 1,
    prompt: 'What does this program print? `Duck`, `Robot` and `Stone` share no base class except `object`.',
    codeLang: 'python',
    code: `class Duck:
    def speak(self):
        return "Quack"


class Robot:
    def speak(self):
        return "Beep"


class Stone:
    pass


for thing in [Duck(), Robot(), Stone()]:
    try:
        print(thing.speak())
    except AttributeError:
        print(type(thing).__name__, "is silent")`,
    options: [
      { text: 'Quack\nBeep\nStone is silent', correct: true, why: 'Duck typing: each object is asked for `speak` at run time. `Duck` and `Robot` have one; `Stone` raises `AttributeError`, which is caught.' },
      { text: 'Quack\nRobot is silent\nStone is silent', correct: false, why: 'Python does not require a shared base or the "same" method. `Robot.speak` is found on `Robot` itself, regardless of `Duck`.' },
      { text: 'Quack\nBeep\nNone', correct: false, why: 'A missing attribute is never silently `None`: looking it up raises `AttributeError`, which the `except` branch handles.' },
      { text: 'TypeError: list items must share a common base class', correct: false, why: 'Python lists can hold any mix of objects. Nothing checks types when the list is built or iterated.' },
    ],
    explanation: `"If it walks like a duck and quacks like a duck, it is a duck." Python does not care what class an object belongs to, only whether it has the attribute you use. \`thing.speak\` is looked up on \`type(thing)\` when the line runs; if no class in its MRO defines it, Python raises \`AttributeError\`.

The \`try/except\` here is **EAFP** style. Note that it would also catch an \`AttributeError\` raised *inside* a \`speak()\` method; a stricter version looks up \`thing.speak\` inside the \`try\` and calls it in an \`else:\` block. In C++, a common base class with a virtual \`speak()\` is required for this kind of runtime polymorphism.`,
  },
  {
    id: 'polymorphism-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'In C++ terms, which statement about Python methods is accurate?',
    options: [
      { text: 'Every method behaves like a C++ virtual function: `obj.method()` is looked up on `type(obj)` (through its MRO) at call time, so a subclass override wins even when the call is made from base-class code.', correct: true, why: 'Right. There is no `virtual` keyword because there is nothing to opt into: dynamic lookup is the only kind of method call.' },
      { text: 'Methods are non-virtual by default; only `@abstractmethod` methods are dispatched dynamically.', correct: false, why: '`@abstractmethod` only marks a method as required for instantiation (Module 07). Every method, abstract or not, is looked up on the object\'s class.' },
      { text: 'Calls from inside `__init__` are bound statically, like virtual calls in C++ constructors, so they run the base version.', correct: false, why: 'Python has no such rule. The object\'s class is fixed when `__new__` creates it, so a base `__init__` calling `self.f()` runs the subclass override, even before the subclass `__init__` has finished.' },
      { text: 'Python picks the method from the variable\'s type annotation, e.g. `a: Animal` calls `Animal`\'s methods.', correct: false, why: 'Annotations have no effect at run time. Lookup always starts at the class of the object the variable refers to.' },
      { text: 'Only calls made through `super()` are dispatched dynamically.', correct: false, why: 'It is the other way round: every call is dynamic, and `super()` is a way to *skip* the current class and continue the MRO lookup after it.' },
    ],
    explanation: `In Python, \`obj.method\` triggers attribute lookup on the object's class at the moment the line runs, walking \`type(obj).__mro__\`. So every method is "virtual": a base class's code calling \`self.hook()\` always gets the most-derived override.

The only ways to bypass dispatch are to name the class explicitly (\`Base.method(obj)\`) or to use a double-underscore name, which is mangled to \`_Base__method\` so that subclasses cannot override it by accident.`,
  },
  {
    id: 'polymorphism-q11', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print? `render` is defined only in `Report`.',
    codeLang: 'python',
    code: `class Report:
    def render(self):
        return f"{self.header()} | {self.body()} | {self.footer()}"

    def header(self):
        return "REPORT"

    def body(self):
        return "..."

    def footer(self):
        return "end"


class SalesReport(Report):
    def body(self):
        return "sales: 42"

    def footer(self):
        return super().footer().upper()


print(SalesReport().render())
print(Report().render())`,
    options: [
      { text: 'REPORT | sales: 42 | END\nREPORT | ... | end', correct: true, why: '`render` runs in `Report`, but `self` is a `SalesReport`, so `self.body()` and `self.footer()` find the overrides. A plain `Report` uses its own hooks.' },
      { text: 'REPORT | ... | end\nREPORT | ... | end', correct: false, why: 'Code written in the base class does not call "the base methods": `self.body()` is looked up on the actual object\'s class, which is `SalesReport`.' },
      { text: 'REPORT | sales: 42 | end\nREPORT | ... | end', correct: false, why: '`SalesReport.footer` overrides the hook and calls `super().footer().upper()`, turning `end` into `END`.' },
      { text: 'REPORT | sales: 42 | END\nREPORT | sales: 42 | END', correct: false, why: 'Defining a subclass does not change the base class. A plain `Report` object still finds `Report.body` and `Report.footer`.' },
      { text: 'AttributeError', correct: false, why: '`SalesReport` inherits `render` and `header` from `Report`; an override of some methods leaves the others available.' },
    ],
    explanation: `This is the **template method** pattern (Module 20): the base class owns the algorithm (\`render\` fixes the layout), and subclasses customize individual steps (*hooks*) by overriding them. It works because \`self.body()\` inside \`render\` is a dynamically dispatched call on the actual object.

In C++ the same design needs the hooks to be \`virtual\`. If \`body()\` were non-virtual, \`render()\` would always call \`Report::body\`, whatever the object.`,
  },
  {
    id: 'polymorphism-q12', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'A program has a polymorphic base `Shape` with 3 virtual functions and two derived classes, `Circle` and `Square`, each overriding one of them. It creates 1000 `Circle` and 500 `Square` objects. In the usual vtable implementation (single inheritance), how many vtables and vptrs exist?',
    options: [
      { text: 'One vtable per polymorphic class (3 in total, each with a slot for every virtual function), shared by all its objects; one vptr inside each of the 1500 objects.', correct: true, why: 'The table describes the *class*, so it is shared; the vptr says which class an object is, so every object needs its own.' },
      { text: '1500 vtables, one per object, so that each object can carry its own overrides.', correct: false, why: 'Overrides belong to classes, not objects, so every `Circle` shares one table. Copying the table into each object would waste memory for nothing.' },
      { text: 'Three vtables, and one vptr per virtual function in every object (4500 vptrs).', correct: false, why: 'An object needs only one pointer, to its class\'s table; the table holds one slot per virtual function.' },
      { text: '`Circle`\'s vtable holds only the one function it overrides; calls to the other two are looked up in `Shape`\'s vtable at run time.', correct: false, why: 'Every slot is filled at compile time with the *final overrider*. Inherited slots in `Circle`\'s table simply point to `Shape`\'s implementations, so a call is always one indirect jump.' },
      { text: 'No vtables at all: the compiler resolves every virtual call at compile time.', correct: false, why: 'The compiler usually cannot know the dynamic type behind a `Shape&`. Devirtualization happens only when it can prove the type, for example through `final` or a local object.' },
    ],
    explanation: `In the common implementation, each polymorphic class has one **vtable**: an array of pointers to the final overriders of its virtual functions (plus run-time type information). Each object of a polymorphic class carries a hidden **vptr** to its class's table, usually making it one pointer larger. A virtual call loads the vptr, indexes the slot, and jumps.

\`Shape\`'s own table exists even if no plain \`Shape\` is ever created: the vptr points to it while \`Shape\`'s constructor runs, which is why virtual calls in constructors reach the base version. The standard does not mandate vtables, only the behavior; multiple inheritance can add extra vptrs per object (Module 12).`,
  },
  {
    id: 'polymorphism-q13', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'You want one loop that calls `speak()` on a mix of `Dog` and `Robot` objects stored in a single container. What does each language require?',
    options: [
      { text: 'C++: a common base class with a virtual `speak()`, and a container of base pointers such as `std::vector<std::unique_ptr<Speaker>>`. Python: nothing; any object with a `speak` method works (duck typing), though a shared base or a `Protocol` can document the interface.', correct: true, why: 'C++ dispatch goes through the vtable of a shared base class, while Python simply looks `speak` up on each object at run time.' },
      { text: 'Both require a common base class; Python raises `TypeError` when a list mixes unrelated classes.', correct: false, why: 'Python lists hold any objects, and a method call only needs the attribute to exist on that object. No base class is involved.' },
      { text: 'C++ only needs both classes to have a `speak()` member with the same signature; the program matches them by name at run time.', correct: false, why: 'C++ has no run-time lookup by name. Templates match by name, but at *compile time* and separately for each type, so they cannot handle a run-time mix in one container.' },
      { text: 'Neither: in C++, `std::vector<auto>` can hold both `Dog` and `Robot` objects.', correct: false, why: '`std::vector<auto>` is not valid C++. A vector stores objects of exactly one type; mixing types needs base pointers or a closed alternative such as `std::variant<Dog, Robot>`.' },
    ],
    explanation: `C++ runtime polymorphism is **nominal**: objects must share a base class that declares the virtual function, and they are handled through pointers or references to that base. Python's is **structural** (duck typing): all that matters is that the attribute exists when the call runs.

C++ has structural alternatives, but at compile time: templates and concepts (Module 15). \`std::variant<Dog, Robot>\` with \`std::visit\` handles a fixed set of types without a base class. Python can add *static* structure with \`typing.Protocol\` (Module 07) without requiring inheritance.`,
  },
  {
    id: 'polymorphism-q14', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: 'The loop uses a reference and `sound` is virtual, yet it prints `...` twice. What is wrong, and what is the fix?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>
#include <vector>

struct Animal {
    virtual ~Animal() = default;
    virtual std::string sound() const { return "..."; }
};
struct Dog : Animal { std::string sound() const override { return "Woof"; } };
struct Cat : Animal { std::string sound() const override { return "Meow"; } };

int main() {
    std::vector<Animal> zoo;
    zoo.push_back(Dog{});
    zoo.push_back(Cat{});
    for (const Animal& a : zoo) std::cout << a.sound() << "\\n";
}`,
    options: [
      { text: '`std::vector<Animal>` stores `Animal` objects by value, so `push_back` slices each `Dog` and `Cat` into a plain `Animal`. Store owning pointers instead: `std::vector<std::unique_ptr<Animal>>`, `zoo.push_back(std::make_unique<Dog>());`, and call `a->sound()`.', correct: true, why: 'The elements themselves are `Animal`s, so no reference to them can recover a `Dog`. Pointers to separately allocated objects keep the dynamic type.' },
      { text: 'Write `zoo.emplace_back(Dog{})` instead of `push_back`, so the `Dog` is constructed in place.', correct: false, why: '`emplace_back` constructs an *element*, and the element type is still `Animal`: it copies the `Animal` part of the temporary `Dog`. Slicing happens either way.' },
      { text: 'Use `std::vector<Animal&>` so that the vector stores references to the original objects.', correct: false, why: 'Standard containers cannot store references; `std::vector<Animal&>` does not compile. (`std::reference_wrapper<Animal>` exists, but the objects would still need an owner.)' },
      { text: 'Declare the loop variable as `auto` instead of `const Animal&`.', correct: false, why: '`auto` would deduce `Animal` and make yet another copy. The loop is not the problem: the elements were already sliced when they were inserted.' },
    ],
    explanation: `A \`std::vector<T>\` stores objects of **exactly** type \`T\`, contiguously. \`push_back(Dog{})\` must create an \`Animal\` element, so it copies only the \`Animal\` part of the \`Dog\` (slicing). Each element's dynamic type is \`Animal\`, and virtual calls run \`Animal::sound\`.

~~~cpp
std::vector<std::unique_ptr<Animal>> zoo;
zoo.push_back(std::make_unique<Dog>());
zoo.push_back(std::make_unique<Cat>());
for (const auto& a : zoo) std::cout << a->sound() << "\\n";   // Woof, Meow
~~~

\`std::unique_ptr\` gives each object a clear owner and deletes it through \`Animal*\`, which is safe because \`Animal\` has a virtual destructor. Use \`std::vector<Animal*>\` only for non-owning views of objects owned elsewhere.`,
  },
  {
    id: 'polymorphism-q15', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Which statement about deriving `Ring` from `Circle` is correct?',
    codeLang: 'cpp',
    code: `struct Shape {
    virtual ~Shape() = default;
    virtual void draw() const;
    virtual double area() const;
};

struct Circle : Shape {
    void draw() const final;
    double area() const override;
};

struct Ring : Circle {
    // ...
};`,
    options: [
      { text: '`Ring` may override `area()` but not `draw()`. Deriving from `Circle` is fine, because only the function is `final`, not the class.', correct: true, why: '`final` after a virtual function\'s declarator ends that function\'s overriding chain. `struct Circle final` would be needed to forbid derivation entirely.' },
      { text: '`Ring` cannot derive from `Circle` at all, because `Circle` has a `final` member function.', correct: false, why: 'A `final` function and a `final` class are different things. Derivation is forbidden only by `struct Circle final : Shape`.' },
      { text: '`Ring` can still override `draw()` as long as it leaves out the `override` keyword.', correct: false, why: 'A function with the same signature overrides whether or not it says `override`. GCC rejects it: *virtual function \'virtual void Ring::draw() const\' overriding final function*.' },
      { text: '`final` makes `Circle::draw` non-virtual, so a call through a `Shape&` that refers to a `Circle` runs `Shape::draw`.', correct: false, why: '`Circle::draw` is still virtual and is still the final overrider for `Circle` objects (and `Ring` objects). `final` only forbids further overriding.' },
    ],
    explanation: `\`final\` on a virtual function means "no class derived from this one may override it". Any \`Ring::draw() const\` would be an override, with or without the keyword, so it is an error. Other virtual functions, like \`area()\`, remain overridable, and \`Ring\` itself is a perfectly valid class.

Only virtual functions can be \`final\` (*'void F::g()' marked 'final', but is not virtual*). Besides documenting intent, \`final\` lets the compiler devirtualize: a call to \`draw()\` through a \`Circle&\` can jump straight to \`Circle::draw\`, because no further override can exist.`,
  },
  {
    id: 'polymorphism-q16', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'A billing module repeats `switch (account.type) { case Basic: ...; case Premium: ...; }` (or an `isinstance` chain) in `fee()`, `limit()` and `describe()`. Why is moving each case into a virtual method of its account class (`account.fee()`) usually the better design?',
    options: [
      { text: 'Each account type\'s rules live in one class, and adding a new type means adding one class instead of finding and editing every switch. Callers depend only on the interface (the open/closed principle).', correct: true, why: 'That is the main payoff: knowledge about a type is in one place, and existing callers keep working, unchanged, with types written later.' },
      { text: 'Virtual calls are always faster than a `switch`.', correct: false, why: 'Performance is roughly comparable, and a switch can even be faster because it can be inlined. The benefit is in design and maintenance, not speed.' },
      { text: 'It also makes adding new *operations* easier, because no existing class has to change.', correct: false, why: 'The opposite: a new virtual operation must be added to the base and implemented in every class. Polymorphism makes new *types* cheap; a switch, or `std::variant` with `std::visit`, makes new *operations* cheap.' },
      { text: 'It removes the need for any base class or shared interface.', correct: false, why: 'In C++ the virtual method lives in a shared base class, and that interface is exactly what callers depend on. (Python duck typing can skip the base class, but there is still a shared method name.)' },
      { text: 'A `switch` cannot handle more than a few account types without becoming invalid code.', correct: false, why: 'A switch can have any number of cases. The problem is maintenance: the same switch is duplicated in many places and must be kept in sync.' },
    ],
    explanation: `Type switches spread one type's behavior across many functions, so adding a type means editing all of them, and the ones you miss fail at run time (or silently fall into a default branch). Polymorphism inverts the structure: each class owns its behavior, and \`account.fee()\` works for every account type, including future ones.

Neither design wins everywhere (the *expression problem*). If the set of types is closed and new operations are added often, a \`std::variant\` with \`std::visit\` (or Python's \`match\`) keeps each operation in one place. If new types are added more often, virtual functions win.`,
  },
  {
    id: 'polymorphism-q17', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <typeinfo>

struct Animal { virtual ~Animal() = default; };
struct Dog : Animal { void fetch() const { std::cout << "fetch "; } };
struct Cat : Animal {};

void play(Animal& a) {
    if (auto* d = dynamic_cast<Dog*>(&a)) d->fetch();
    else std::cout << "no-dog ";
}

int main() {
    Dog d;
    Cat c;
    play(d);
    play(c);
    Animal& a = c;
    try {
        dynamic_cast<Dog&>(a).fetch();
    } catch (const std::bad_cast&) {
        std::cout << "bad_cast";
    }
    std::cout << "\\n";
}`,
    options: [
      { text: 'fetch no-dog bad_cast', correct: true, why: 'A pointer `dynamic_cast` to the wrong type yields `nullptr`; a reference cast cannot be null, so it throws `std::bad_cast`.' },
      { text: 'fetch fetch fetch', correct: false, why: 'That would be the (undefined) behavior of an unchecked `static_cast`. `dynamic_cast` checks the dynamic type at run time and refuses when the object is not a `Dog`.' },
      { text: 'fetch no-dog fetch', correct: false, why: 'A reference cast has no null value to return on failure, so it reports failure by throwing `std::bad_cast` instead.' },
      { text: 'Compilation error: Animal needs a virtual function other than its destructor', correct: false, why: 'Any virtual function, including a virtual destructor, makes a class polymorphic, and that is all `dynamic_cast` needs for a downcast.' },
    ],
    explanation: `\`dynamic_cast<Derived*>(basePtr)\` asks at run time "is the object really a \`Derived\` (or derived from it)?" and returns \`nullptr\` if not. The reference form \`dynamic_cast<Derived&>(baseRef)\` throws \`std::bad_cast\` (from \`<typeinfo>\`) instead. Both need a **polymorphic** source type, because the check uses run-time type information reached through the vptr.

Treat chains of \`dynamic_cast\` as a design smell: \`play\` must be edited for every new animal. A virtual \`play()\` in \`Animal\`, overridden by \`Dog\` to fetch, needs no cast at all.`,
  },
  {
    id: 'polymorphism-q18', lang: 'python', type: 'output', difficulty: 3,
    prompt: 'What does this program print? Compare with C++, where a virtual call in a base constructor runs the base version.',
    codeLang: 'python',
    code: `class Widget:
    def __init__(self):
        print("init sees", self.name())

    def name(self):
        return "widget"


class Button(Widget):
    def __init__(self, label):
        super().__init__()
        self.label = label

    def name(self):
        return "button " + self.label


Widget()
try:
    Button("OK")
except AttributeError:
    print("AttributeError")`,
    options: [
      { text: 'init sees widget\nAttributeError', correct: true, why: '`Widget.__init__` calls `self.name()`, which dispatches to `Button.name` because the object is already a `Button`. But `self.label` is only set after `super().__init__()` returns.' },
      { text: 'init sees widget\ninit sees widget', correct: false, why: 'That is the C++ rule for constructors. In Python, the object\'s class is `Button` from the moment `__new__` creates it, so `self.name()` finds `Button.name`.' },
      { text: 'init sees widget\ninit sees button OK', correct: false, why: '`Button.__init__` assigns `self.label` *after* calling `super().__init__()`, so the label does not exist yet when `Widget.__init__` runs.' },
      { text: 'init sees widget\ninit sees button None', correct: false, why: 'Unassigned attributes are not `None`; they simply do not exist, and reading one raises `AttributeError`.' },
    ],
    explanation: `Python creates the object with its final class first (\`__new__\`) and only then runs \`__init__\`. Every method call inside the base \`__init__\` is therefore dispatched to the subclass, even though the subclass's \`__init__\` has not finished setting attributes. C++ does the opposite: while \`Widget()\` runs, the object is a \`Widget\`, so the call reaches \`Widget::name\`.

Neither behavior makes such calls safe. Prefer not to call overridable methods from constructors or \`__init__\`; if you must, document the hook and make sure subclasses set what it needs *before* calling \`super().__init__()\`.`,
  },
  {
    id: 'polymorphism-q19', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print? The override changes the **default argument**.',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Printer {
    virtual ~Printer() = default;
    virtual void print(int copies = 1) const { std::cout << "Printer x" << copies << "\\n"; }
};

struct Laser : Printer {
    void print(int copies = 2) const override { std::cout << "Laser x" << copies << "\\n"; }
};

int main() {
    Laser laser;
    const Printer& p = laser;
    p.print();
    laser.print();
}`,
    options: [
      { text: 'Laser x1\nLaser x2', correct: true, why: 'The function body is chosen by the dynamic type (`Laser`), but the default argument is filled in at compile time from the static type of the call (`Printer`, then `Laser`).' },
      { text: 'Laser x2\nLaser x2', correct: false, why: 'Default arguments are not looked up through the vtable. The compiler inserts them at the call site, using the declaration it sees for the static type.' },
      { text: 'Printer x1\nLaser x2', correct: false, why: '`print` is virtual and `p` is a reference, so the call is dispatched to `Laser::print`. Only the default argument comes from `Printer`.' },
      { text: 'Compilation error: an override may not change a default argument', correct: false, why: 'It compiles, which is what makes this a trap. The language allows different defaults; style guides forbid them.' },
    ],
    explanation: `A call is compiled in two parts. **Default arguments** are substituted at compile time from the declaration found through the expression's **static type**: \`p.print()\` becomes \`p.print(1)\`. **Which function runs** is decided at run time by the dynamic type, so \`Laser::print\` executes with \`copies == 1\`.

The C++ Core Guidelines (C.140) say: do not give different default arguments to a virtual function and its overrider. A common alternative is a non-virtual public function with the default that forwards to a virtual implementation without defaults.`,
  },
];
