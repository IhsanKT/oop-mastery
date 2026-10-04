export default [
  {
    id: 'inheritance-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What relationship should **public inheritance** (`class Dog : public Animal` / `class Dog(Animal):`) model?',
    options: [
      { text: 'An **is-a** relationship: every `Dog` is an `Animal`, so a `Dog` can be used anywhere an `Animal` is expected.', correct: true, why: 'Right. Inheritance is a promise of substitutability: code written for the base keeps working when it is handed a derived object.' },
      { text: 'A **has-a** relationship: a `Car` has an `Engine`, so `Car` should inherit from `Engine` to get its methods.', correct: false, why: 'Has-a is composition: `Car` should hold an `Engine` member. Inheriting would claim that a car *is* an engine and expose engine operations on every car.' },
      { text: 'Plain code sharing: whenever two classes have a few methods in common, one should inherit from the other.', correct: false, why: 'Shared code alone is not a reason to inherit. Without a genuine is-a relationship, move the shared part into a helper or a member object (composition) instead.' },
      { text: 'A two-way equivalence: a `Dog` can stand in for an `Animal`, and an `Animal` can stand in for a `Dog`.', correct: false, why: 'Substitution goes one way only. Every `Dog` is an `Animal`, but an arbitrary `Animal` might be a `Cat` with no `bark()`, so it cannot replace a `Dog`.' },
    ],
    explanation: `Public inheritance says "every \`Derived\` **is a** \`Base\`", and therefore "a \`Derived\` can be used wherever a \`Base\` is expected": C++ converts \`Dog&\` to \`Animal&\`, and Python's \`isinstance(dog, Animal)\` is \`True\`. Reusing the base's code comes along, but it is a side effect, not the goal.

Before inheriting, ask: *will every piece of code written for the base work correctly with the derived object?* If not, or if the relationship is really "has a", use composition and make the other object a member.`,
  },
  {
    id: 'inheritance-q02', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
struct Engine { Engine() { std::cout << "Engine "; } ~Engine() { std::cout << "~Engine "; } };
struct Vehicle { Vehicle() { std::cout << "Vehicle "; } ~Vehicle() { std::cout << "~Vehicle "; } };
struct Car : Vehicle {
    Engine engine;
    Car() { std::cout << "Car "; }
    ~Car() { std::cout << "~Car "; }
};
int main() { Car c; }`,
    options: [
      { text: 'Vehicle Engine Car ~Car ~Engine ~Vehicle', correct: true, why: 'Base subobject first, then members in declaration order, then the constructor body. Destruction is the exact reverse.' },
      { text: 'Car Engine Vehicle ~Vehicle ~Engine ~Car', correct: false, why: 'The derived constructor body runs last, not first: it may use the base and the members, so they must already exist.' },
      { text: 'Engine Vehicle Car ~Car ~Vehicle ~Engine', correct: false, why: 'Members are built after the base class, even though they are declared inside `Car`. The base is the foundation `Car` is built on.' },
      { text: 'Vehicle Engine Car ~Vehicle ~Engine ~Car', correct: false, why: 'Destruction does not repeat construction order. It is reversed, so nothing is destroyed while something built on top of it still exists.' },
    ],
    explanation: `C++ builds an object from the inside out: **base classes**, then **data members in declaration order**, then the **constructor body**. Destruction runs in exactly the reverse order. This guarantees that when \`Car\`'s body runs, its \`Vehicle\` part and \`engine\` are fully usable, and that when \`~Car\` runs they still exist.

The order of the member-initializer list does **not** change this; GCC warns with \`-Wreorder\` if your list is written in a different order.`,
  },
  {
    id: 'inheritance-q03', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Animal:
    def __init__(self, name):
        self.name = name


class Dog(Animal):
    def __init__(self, name, breed):
        self.breed = breed      # no super().__init__(name)


d = Dog("Rex", "beagle")
print(d.breed)
try:
    print(d.name)
except Exception as e:
    print(type(e).__name__)`,
    options: [
      { text: 'beagle\nAttributeError', correct: true, why: '`Dog.__init__` replaced `Animal.__init__` and never called it, so `name` was never assigned. Reading a missing attribute raises `AttributeError`.' },
      { text: 'beagle\nRex', correct: false, why: 'Python does not chain `__init__` calls automatically. Once `Dog` defines its own `__init__`, `Animal.__init__` runs only if `Dog` calls `super().__init__(name)`.' },
      { text: 'beagle\nNone', correct: false, why: 'Python attributes have no default value. An instance attribute exists only after something assigns it; it is never pre-filled with `None`.' },
      { text: 'beagle\nNameError', correct: false, why: '`NameError` is for unbound *variable* names, such as a misspelled local or global. A missing attribute on an object, like `d.name`, raises `AttributeError`.' },
    ],
    explanation: `In Python, \`__init__\` is an ordinary method found by attribute lookup. Because \`Dog\` defines its own \`__init__\`, lookup finds \`Dog.__init__\` and \`Animal.__init__\` never runs: Python never chains initializers for you. Instance attributes are created by assignment, so \`name\` simply does not exist.

Notice *when* the error appears: not at \`Dog("Rex", "beagle")\`, but later, at the first read of \`d.name\`. That delay is what makes this bug painful, and why an overriding \`__init__\` should start with \`super().__init__(...)\`.`,
  },
  {
    id: 'inheritance-q04', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Shape:
    def describe(self):
        return "shape"


class Polygon(Shape):
    def describe(self):
        return super().describe() + " > polygon"


class Triangle(Polygon):
    def describe(self):
        return super().describe() + " > triangle"


class RightTriangle(Triangle):
    pass


print(RightTriangle().describe())
print(Polygon().describe())`,
    options: [
      { text: 'shape > polygon > triangle\nshape > polygon', correct: true, why: 'Each override first calls `super().describe()` and then appends its own part, so the base text comes first. A `Polygon` object never involves `Triangle`.' },
      { text: 'triangle\npolygon', correct: false, why: 'Overriding does not stop the base code from running here: each override explicitly calls `super().describe()` and builds on its result.' },
      { text: 'triangle > polygon > shape\npolygon > shape', correct: false, why: 'The `super()` result is the *left* operand of `+`, so the base string comes first. Each level returns "base text + my part".' },
      { text: 'shape > polygon > triangle\nshape > polygon > triangle', correct: false, why: 'Defining `Triangle` does not modify `Polygon`. For a `Polygon` object, lookup starts at `Polygon`; an override only affects instances of the subclass.' },
      { text: 'AttributeError', correct: false, why: 'An empty subclass inherits everything. `RightTriangle().describe()` walks the MRO and finds `Triangle.describe`; `pass` removes nothing.' },
    ],
    explanation: `Method lookup walks the class's MRO. For a \`RightTriangle\` it is \`RightTriangle → Triangle → Polygon → Shape → object\`, so \`Triangle.describe\` runs. Inside it, \`super().describe()\` continues the lookup *after* \`Triangle\` and reaches \`Polygon.describe\`, which in turn calls \`Shape.describe\`. The results flow back outward and each level appends its own text, so the most general part comes first.

This "call the base, then extend" pattern keeps each class responsible only for its own part. The C++ equivalent is \`return Polygon::describe() + " > triangle";\`.`,
  },
  {
    id: 'inheritance-q05', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: "This code fails to compile with `error: no matching function for call to 'Animal::Animal()'`. What is the correct fix?",
    codeLang: 'cpp',
    code: `#include <string>

class Animal {
public:
    explicit Animal(std::string name) : name_(name) {}
private:
    std::string name_;
};

class Dog : public Animal {
public:
    Dog(std::string name, std::string breed) {   // error reported here
        breed_ = breed;
    }
private:
    std::string breed_;
};`,
    options: [
      { text: 'Name the base constructor in the member-initializer list: `Dog(std::string name, std::string breed) : Animal(name), breed_(breed) {}`', correct: true, why: 'The base subobject is built before the body runs, from whatever the initializer list says. Naming `Animal(name)` there gives it the argument it needs.' },
      { text: 'Call it as the first statement of the body: `Animal(name);`', correct: false, why: 'Too late: the base must exist before the body starts, so the compiler still needs `Animal()`. Worse, `Animal(name);` parses as a declaration of a local variable `name` of type `Animal`.' },
      { text: "Make `name_` `protected` and assign it in `Dog`'s constructor body.", correct: false, why: 'Access is not the problem; construction is. Even with access, `Animal` must be constructed first, and it has no default constructor to do that.' },
      { text: "Remove `explicit` from `Animal`'s constructor.", correct: false, why: '`explicit` only forbids *implicit conversions* such as `Animal a = std::string("Rex");`. The real problem is that no `Animal` constructor is called with an argument at all.' },
    ],
    explanation: `Every \`Dog\` contains an \`Animal\` subobject, and C++ constructs it **before** \`Dog\`'s constructor body runs. If the member-initializer list does not name a base constructor, the compiler uses the base's default constructor. \`Animal\` has none, because declaring any constructor suppresses the implicit default one.

The fix forwards the arguments in the initializer list (\`std::move\` avoids extra string copies):

~~~cpp
Dog(std::string name, std::string breed)
    : Animal(std::move(name)), breed_(std::move(breed)) {}
~~~

Giving \`Animal\` a default constructor would also compile, but only do that if a nameless animal is a meaningful object.`,
  },
  {
    id: 'inheritance-q06', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Which of the commented-out lines in `outside()` would compile if you uncommented them?',
    codeLang: 'cpp',
    code: `class Base {
public:
    void hello() {}
protected:
    void helper() {}
};

class Derived : protected Base {
public:
    void work() { hello(); helper(); }   // fine: inside Derived
};

void outside(Derived& d) {
    d.work();
    // d.hello();      // (A)
    // d.helper();     // (B)
    // Base& b = d;    // (C)
}`,
    options: [
      { text: 'None of them.', correct: true, why: 'Protected inheritance makes `hello` and `helper` protected members of `Derived`, and hides the `Derived` to `Base` conversion from outside code.' },
      { text: 'Only (A): `hello` was public in `Base`, and public members stay public.', correct: false, why: 'Under `protected` inheritance, public base members become *protected* in `Derived`. Outside code cannot use protected members, so `d.hello()` is rejected.' },
      { text: 'Only (C): a `Derived` is always a `Base`, so the conversion is allowed.', correct: false, why: "With non-public inheritance the is-a relationship is invisible to outside code. GCC reports: 'Base' is an inaccessible base of 'Derived'." },
      { text: 'All three: the inheritance mode only affects classes that derive from `Derived`.', correct: false, why: 'The mode affects *every* access through `Derived`, including outside code. Classes derived from `Derived` are, in fact, the ones that keep access, since the members are protected.' },
    ],
    explanation: `The keyword in front of a base caps the visibility of inherited members. With \`protected\` inheritance, public and protected base members both become **protected** members of \`Derived\` (private ones stay inaccessible). Protected means "this class, its friends and its derived classes", so \`outside()\` can use none of them.

The same rule governs the conversion \`Derived&\` → \`Base&\`: it is only available where the base is accessible. That is why protected and private inheritance mean "implemented in terms of", not "is a". In practice, composition usually expresses that more clearly.`,
  },
  {
    id: 'inheritance-q07', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How does a C++ `protected` member compare with a Python attribute named `_balance` (one leading underscore)?',
    options: [
      { text: 'C++ `protected` is enforced by the compiler (only the class, its friends and derived classes may use it); `_balance` is a naming convention that nothing enforces.', correct: true, why: "Both mean 'internal, for this class and its subclasses', but only C++ checks it. In Python any code can read or write `obj._balance`; linters and IDEs merely warn." },
      { text: 'Both are enforced: Python raises `AttributeError` when code outside the class hierarchy touches `_balance`.', correct: false, why: 'Python performs no access check for underscores: `acct._balance = 0` works from anywhere. A single underscore only affects `from module import *`, which skips such module-level names.' },
      { text: "Python's `protected` is the double underscore: `__balance` is visible to subclasses but blocked for outsiders.", correct: false, why: '`__balance` is *name-mangled* to `_Account__balance`. That makes it awkward for subclasses (their `self.__balance` mangles to a different name) and does not stop outsiders, who can use the mangled name.' },
      { text: 'C++ `protected` members can be used by any code in the same source file, like module-level privacy in Python.', correct: false, why: 'C++ access control is per class, not per file. Python has no module-level privacy either: a leading underscore there is also just a convention.' },
    ],
    explanation: `Both mechanisms communicate the same intent: "this is an implementation detail for the class and its subclasses, not public API". The difference is enforcement. C++ checks access at compile time, so \`account.balance_\` from outside the hierarchy is an error. Python relies on convention ("we are all consenting adults"): \`_balance\` is fully accessible, and tools only warn.

C++ adds a subtlety Python lacks: a derived class may access a protected member only through objects of its own type (or its subclasses), not through an arbitrary \`Base&\`.`,
  },
  {
    id: 'inheritance-q08', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print? Note that `show` takes its parameter **by value**.',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>

class Animal {
public:
    explicit Animal(std::string name) : name_(name) {}
    std::string describe() const { return name_ + " is an animal"; }
protected:
    std::string name_;
};

class Dog : public Animal {
public:
    Dog(std::string name, std::string breed) : Animal(name), breed_(breed) {}
    std::string describe() const { return name_ + " is a " + breed_; }
private:
    std::string breed_;
};

void show(Animal a) { std::cout << a.describe() << "\\n"; }

int main() {
    Dog rex("Rex", "beagle");
    std::cout << rex.describe() << "\\n";
    show(rex);
}`,
    options: [
      { text: 'Rex is a beagle\nRex is an animal', correct: true, why: "`rex.describe()` uses `Dog`'s version. `show` receives a sliced copy that really is an `Animal`, so `Animal::describe` runs." },
      { text: 'Rex is a beagle\nRex is a beagle', correct: false, why: 'Passing by value constructs a brand-new `Animal` from the `Animal` part of `rex` (slicing). The copy has no breed and no `Dog` behavior; besides, `describe` is not virtual.' },
      { text: 'Rex is an animal\nRex is an animal', correct: false, why: 'In `main`, `rex` has static type `Dog`, so `rex.describe()` calls `Dog::describe`, which hides the base version.' },
      { text: 'Compilation error', correct: false, why: "Public inheritance makes the conversion legal: `Animal`'s copy constructor takes a `const Animal&`, which binds to the `Animal` subobject of `rex`. That is exactly how slicing happens." },
    ],
    explanation: `\`show\` takes its parameter **by value**, so the parameter is a new \`Animal\` object initialized from \`rex\`. \`Animal\`'s implicitly generated copy constructor binds its \`const Animal&\` parameter to the \`Animal\` part of \`rex\` and copies only \`name_\`; \`breed_\` and the "Dog-ness" are sliced away. The result is a genuine \`Animal\`, so even a \`virtual\` function would run \`Animal\`'s version on it.

Taking \`const Animal&\` avoids the copy, but with a **non-virtual** \`describe\` it would still print \`Rex is an animal\`, because the call is resolved from the static type \`Animal\`. Getting \`Dog\`'s behavior through a base reference needs both a reference (or pointer) *and* \`virtual\` (Module 06).`,
  },
  {
    id: 'inheritance-q09', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Base {
    void f(double x) { std::cout << "Base::f(double) " << x << "\\n"; }
};

struct Derived : Base {
    void f(int x) { std::cout << "Derived::f(int) " << x << "\\n"; }
};

int main() {
    Derived d;
    d.f(1.5);
    d.Base::f(1.5);
}`,
    options: [
      { text: 'Derived::f(int) 1\nBase::f(double) 1.5', correct: true, why: '`Derived::f` hides `Base::f`, so `d.f(1.5)` converts 1.5 to the `int` 1. The qualified call `d.Base::f` reaches the base function explicitly.' },
      { text: 'Base::f(double) 1.5\nBase::f(double) 1.5', correct: false, why: 'Overload resolution never sees `Base::f`: name lookup stops at the first scope that declares an `f` (`Derived`), so the better match in `Base` is hidden.' },
      { text: 'Derived::f(int) 1.5\nBase::f(double) 1.5', correct: false, why: 'The argument is converted to `int` *before* the call, so `x` holds the integer 1. Printing an `int` never shows a fractional part.' },
      { text: 'Derived::f(int) 2\nBase::f(double) 1.5', correct: false, why: 'Converting a floating-point value to an integer truncates toward zero; it does not round. 1.5 becomes 1.' },
      { text: 'Compilation error: the call d.f(1.5) is ambiguous', correct: false, why: 'Ambiguity needs two equally good candidates. `Base::f` is not a candidate at all, so there is exactly one viable function, and double-to-int is a legal implicit conversion.' },
    ],
    explanation: `Name lookup happens **before** overload resolution. Looking up \`f\` in \`Derived\` finds \`Derived::f\` and stops, so \`Base::f(double)\` never becomes a candidate, even though it would be an exact match. The only candidate takes an \`int\`, and \`1.5\` converts to \`1\` (truncation toward zero). The qualified call \`d.Base::f(1.5)\` names the base function explicitly and bypasses hiding.

To make both overloads visible, re-declare the base name in the derived class:

~~~cpp
struct Derived : Base {
    using Base::f;   // f(double) and f(int) are now both candidates
    void f(int x) { /* ... */ }
};
~~~

With that line, \`d.f(1.5)\` calls \`Base::f(double)\`.`,
  },
  {
    id: 'inheritance-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'Given these classes, which expression evaluates to `False`?',
    codeLang: 'python',
    code: `class Animal: pass
class Dog(Animal): pass
class Puppy(Dog): pass

p = Puppy()`,
    options: [
      { text: '`type(p) is Dog`', correct: true, why: '`type(p)` is exactly `Puppy`, and `is` compares identity, so inheritance is ignored and the result is `False`.' },
      { text: '`isinstance(p, Animal)`', correct: false, why: '`isinstance` follows the whole inheritance chain: a `Puppy` is a `Dog`, which is an `Animal`. Grandparents count too.' },
      { text: '`issubclass(Puppy, Puppy)`', correct: false, why: 'Every class is considered a subclass of itself, so `issubclass(C, C)` is `True`.' },
      { text: '`isinstance(p, (int, Dog))`', correct: false, why: 'A tuple means "an instance of any of these". `p` is not an `int`, but it is a `Dog`, so the result is `True`.' },
      { text: '`isinstance(p, object)`', correct: false, why: 'Every Python 3 class implicitly inherits from `object`, so every value is an instance of `object`.' },
    ],
    explanation: `\`type(x)\` returns the object's **exact** class, so \`type(x) is C\` (or \`== C\`) asks "was this object created from \`C\` itself?". \`isinstance(x, C)\` asks "can this object be used as a \`C\`?", which follows inheritance and is almost always the question you mean.

Exact-type checks reject subclasses and so break substitutability: code that tests \`type(a) is Dog\` silently refuses a \`Puppy\`. Prefer \`isinstance\`, and better still, call a method and let each class respond in its own way.`,
  },
  {
    id: 'inheritance-q11', lang: 'python', type: 'bug', difficulty: 3,
    prompt: 'Each plugin class should keep its **own** registry, but `print` shows `[\'mp3\', \'mp4\']`. What is the bug, and what is the best fix?',
    codeLang: 'python',
    code: `class Plugin:
    registry = []

    @classmethod
    def register(cls, name):
        cls.registry.append(name)


class AudioPlugin(Plugin): pass
class VideoPlugin(Plugin): pass

AudioPlugin.register("mp3")
VideoPlugin.register("mp4")
print(AudioPlugin.registry)   # expected ['mp3']`,
    options: [
      { text: 'Subclasses do not get their own copy: `cls.registry` finds `Plugin.registry` through inheritance, and `append` mutates that one shared list. Give each subclass its own list, e.g. `cls.registry = []` in `__init_subclass__`.', correct: true, why: 'Lookup falls back to the base class, and mutating the found list changes it for everyone. Assigning a new list on each subclass breaks the sharing.' },
      { text: '`@classmethod` binds `cls` to `Plugin` rather than to the subclass; use `@staticmethod` instead.', correct: false, why: "`cls` is the class the method was called on (`AudioPlugin`). The problem is that `AudioPlugin` has no `registry` of its own. A `staticmethod` would not even receive a class." },
      { text: 'Move the list into `__init__` as `self.registry = []`.', correct: false, why: 'That creates a per-*instance* list, but `register` works on classes and no instance is ever created. With the class attribute gone, `cls.registry.append` raises `AttributeError`; if you keep it as well, `cls.registry` still finds the shared list.' },
      { text: 'The bug is in the `print`: `AudioPlugin().registry` would show the subclass\'s own list.', correct: false, why: 'Lookup through an instance checks the instance, then its class, then the bases, and lands on the same shared `Plugin.registry` list.' },
    ],
    explanation: `Attribute lookup on a class walks its MRO. \`AudioPlugin.registry\` is not in \`AudioPlugin.__dict__\`, so Python finds \`Plugin.registry\`, and \`append\` mutates that single list, which every subclass shares. *Assigning* to \`cls.registry\` would instead create a new attribute on the subclass, which is exactly what this fix does:

~~~python
class Plugin:
    registry = []

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.registry = []      # runs once for every new subclass
~~~

C++ has the same trap: a \`static\` data member of a base class is one object shared by all derived classes.`,
  },
  {
    id: 'inheritance-q12', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does `final` do here?',
    codeLang: 'cpp',
    code: `class Shape final {
public:
    double area() const { return 0; }
};`,
    options: [
      { text: 'Any attempt to derive from `Shape` (e.g. `class Circle : public Shape {};`) is a compile error. `Shape` objects can still be created, copied and used normally.', correct: true, why: "A `final` class is a leaf of the hierarchy: GCC reports cannot derive from 'final' base 'Shape'. It says nothing about how `Shape` objects are used." },
      { text: 'It makes `Shape` objects immutable, as if every data member were `const`.', correct: false, why: 'That confuses `final` with `const` (or with Java\'s `final` variables). On a class, `final` only restricts inheritance.' },
      { text: "It stops `Shape`'s member functions from being overridden, but `class Circle : public Shape` still compiles.", correct: false, why: 'On a class, `final` forbids derivation entirely. The per-function form, `void draw() const override final;`, is what stops further overriding while still allowing derivation.' },
      { text: 'It is only a hint for documentation and optimizers; deriving from `Shape` compiles with a warning.', correct: false, why: "That describes Python's `typing.final`, which only type checkers enforce. In C++, deriving from a `final` class is a hard error." },
    ],
    explanation: `\`final\` after a class name makes the class a leaf: no class may derive from it. After a virtual function's declarator it prevents further overriding of that one function (Module 06). Both forms document intent, and both can help the compiler turn virtual calls into direct ones (devirtualization).

\`final\` is a *contextual* keyword, so it only has this meaning in those positions (a variable may still be called \`final\`). Python's \`@typing.final\` looks similar but is advisory only: the interpreter lets you subclass anyway.`,
  },
  {
    id: 'inheritance-q13', lang: 'cpp', type: 'compare', difficulty: 3,
    prompt: 'Which numbered line(s) fail to compile?',
    codeLang: 'cpp',
    code: `struct B { void hi() {} };

struct D1 : B {};
class  D2 : B {
public:
    void call() { hi(); }
};

int main() {
    D1 a; a.hi();    // (1)
    D2 b; b.hi();    // (2)
    b.call();        // (3)
}`,
    options: [
      { text: 'Only (2): `class D2 : B` inherits privately by default, so `hi()` is private in `D2`.', correct: true, why: 'The default inheritance access follows the keyword of the class being defined: public for `struct`, private for `class`. `D2`\'s own members can still call `hi()`.' },
      { text: 'None: base classes are inherited publicly unless you write `private`.', correct: false, why: 'That is only true when the derived class is declared with `struct`. A class declared with `class` inherits privately unless you write `public`.' },
      { text: 'Only (1): structs cannot inherit member functions, only data.', correct: false, why: '`struct` and `class` define the same kind of type in C++. The only differences are the default member access and the default inheritance access.' },
      { text: 'Both (2) and (3): with private inheritance, `D2` itself cannot call `hi()` either.', correct: false, why: "Private inheritance hides `B`'s members from *outside* code. Inside `D2`, `hi()` is a private member of `D2`, which `D2`'s own functions may call." },
      { text: 'Both (1) and (2): inheritance is private by default, whichever keyword you use.', correct: false, why: 'The default depends on the keyword of the derived class. `D1` is declared with `struct`, so it inherits publicly and line (1) compiles.' },
    ],
    explanation: `\`struct\` and \`class\` differ in exactly two defaults, both decided by the keyword used for the class **being defined**: default member access (\`struct\`: public, \`class\`: private) and default base-class access (\`struct D : B\` means \`public B\`, \`class D : B\` means \`private B\`).

So \`hi()\` is public in \`D1\` and private in \`D2\`. GCC rejects line (2) with *'void B::hi()' is inaccessible within this context*. Always spell the access out (\`class D2 : public B\`), so readers do not need to remember the rule.`,
  },
  {
    id: 'inheritance-q14', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'In what order are the constructors called when a `Widget` is created?',
    codeLang: 'cpp',
    code: `struct Logger { Logger() { /* ... */ } };
struct Base   { Base()   { /* ... */ } };

class Widget : public Base {
public:
    Widget() : log_(), Base() { /* body */ }
private:
    Logger log_;
};`,
    options: [
      { text: "`Base()`, then `Logger()` for `log_`, then `Widget`'s body.", correct: true, why: 'Bases are constructed first, then members in declaration order, then the body. The order written in the initializer list is ignored.' },
      { text: "`Logger()`, then `Base()`, then `Widget`'s body: the initializer list runs left to right.", correct: false, why: "The initializer list only supplies arguments; the order is fixed by the class definition. GCC's `-Wreorder` (part of `-Wall`) warns that `log_` will be initialized after base `Base`." },
      { text: "`Widget`'s body first, then `Base()` and `Logger()` the first time they are used.", correct: false, why: 'C++ never constructs bases or members lazily. Before the body runs, every base and member is fully constructed, so the body can safely use them.' },
      { text: 'It is unspecified: each compiler may choose its own order.', correct: false, why: 'The order is precisely specified by the standard. That is also what makes destruction order (the exact reverse) well defined.' },
    ],
    explanation: `The standard fixes the order: virtual bases first (Module 12), then direct base classes in the order they are listed after the colon, then non-static data members in **declaration order**, and finally the constructor body. The member-initializer list only says *which arguments* each subobject gets; its own order is irrelevant.

This matters when one initializer reads another subobject: initializing a member from a member declared *later* reads an object that does not exist yet. Write initializer lists in declaration order, and keep \`-Wall\` on so that \`-Wreorder\` catches mismatches.`,
  },
  {
    id: 'inheritance-q15', lang: 'python', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `print(issubclass(bool, int), isinstance(True, int))
print(True + True, type(True) is int)`,
    options: [
      { text: 'True True\n2 False', correct: true, why: '`bool` is a subclass of `int`, so `True` is an `int` (with value 1). `+` is inherited integer addition, and `type(True)` is exactly `bool`.' },
      { text: 'False False\n2 False', correct: false, why: '`bool` is not a separate, unrelated type: since PEP 285 it is defined as a subclass of `int`, with `True == 1` and `False == 0`.' },
      { text: 'False True\n2 False', correct: false, why: '`isinstance` does not consider conversions. `isinstance(True, int)` is `True` precisely *because* `bool` inherits from `int`, which is exactly what `issubclass(bool, int)` reports.' },
      { text: 'True True\nTrue False', correct: false, why: '`bool` does not override `+`, so the inherited `int.__add__` returns the plain `int` 2. (Only `&`, `|` and `^` return a `bool` when both operands are `bool`.)' },
      { text: 'True True\n2 True', correct: false, why: '`type()` returns the exact class, `bool`, and `is` compares identity, so `type(True) is int` is `False` even though `True` is an `int`.' },
    ],
    explanation: `\`bool\` inherits from \`int\`: \`True\` and \`False\` are integers 1 and 0 with a custom \`repr\`. So \`issubclass(bool, int)\` and \`isinstance(True, int)\` are both \`True\`, and arithmetic inherited from \`int\` returns plain integers. \`type(True)\`, however, is still exactly \`bool\`, so the exact-type check is \`False\`.

Two practical consequences: \`isinstance(x, int)\` accepts \`True\`, so check \`isinstance(x, bool)\` first if booleans must be rejected; and \`bool\` itself cannot be subclassed (\`class B(bool): ...\` raises \`TypeError: type 'bool' is not an acceptable base type\`).`,
  },
  {
    id: 'inheritance-q16', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'A teammate writes this stack (the C++ version is `class Stack : public std::vector<int>`). Why is it a poor design, and what should they do instead?',
    codeLang: 'python',
    code: `class Stack(list):
    def push(self, x):
        self.append(x)

    def peek(self):
        return self[-1]`,
    options: [
      { text: 'It inherits the whole list interface (`insert`, indexing, slicing, `sort`...), so callers can break last-in-first-out order. Use composition: keep a private list (or vector) member and expose only `push`, `pop`, `peek` and `empty`.', correct: true, why: 'A stack *has* a list for storage; it is not a list. Composition exposes exactly the operations that keep the stack valid.' },
      { text: 'Nothing is wrong: inheriting is the standard way to reuse a container, and the extra methods are harmless.', correct: false, why: 'Reuse is not a reason to inherit. Public inheritance promises that a `Stack` *is* a list and that every list operation makes sense on it, yet `s.insert(0, x)` silently breaks LIFO order.' },
      { text: 'The only problem is speed: every method call on a subclass of `list` pays for an extra lookup.', correct: false, why: 'Attribute lookup through the MRO is cheap (and cached). The problem is the interface and the invariant, not performance.' },
      { text: 'Override every unwanted method (`insert`, `__setitem__`, `sort`, ...) to raise an error; then the inheritance is correct.', correct: false, why: "That makes substitutability worse: code expecting a list now crashes when handed a `Stack`. You would also have to chase every method, including ones you forgot, like `extend` or `__iadd__`." },
    ],
    explanation: `Inherit only when the derived class is a true **subtype**: everything you can do with the base must make sense, and keep the derived object valid. A stack's invariant is "only the top is visible", but a \`list\` (or \`std::vector\`) offers random access and insertion anywhere, so the subclass cannot keep its own promise.

C++ adds a second reason: standard containers have no virtual destructor, so deleting a \`Stack\` through a \`std::vector<int>*\` is undefined behavior, and none of their member functions are virtual to intercept anyway. The fix in both languages is **composition** (a has-a relationship): a private \`_items\` list or \`std::vector<int> items_\` member behind a small, safe interface. Module 17 covers this in depth.`,
  },
];
