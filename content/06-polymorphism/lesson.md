## Why polymorphism?

A drawing app stores shapes as plain data with a `kind` tag, and every operation switches on that tag:

~~~cpp
enum class Kind { Circle, Rect };
struct Shape { Kind kind; double r, w, h; };

double area(const Shape& s) {
    switch (s.kind) {
        case Kind::Circle: return 3.14159 * s.r * s.r;
        case Kind::Rect:   return s.w * s.h;
    }
    return 0;
}
// draw(), save(), perimeter(): the same switch, again and again
~~~
~~~python
def area(shape):
    if shape["kind"] == "circle":
        return 3.14159 * shape["r"] ** 2
    elif shape["kind"] == "rect":
        return shape["w"] * shape["h"]
    raise ValueError(shape["kind"])
# draw(), save(), perimeter(): the same chain, again and again
~~~

Adding a triangle means editing every one of those switches, in every file, including code you do not own, and what a circle *is* ends up scattered across the program. **Polymorphism** ("many forms") inverts this: each type carries its own behavior, and callers write `s.area()` without knowing which shape they hold. One interface, many behaviors.

> **Note:** Overloading and templates are *compile-time* polymorphism (Module 15). This module covers **runtime** polymorphism: the object picks the behavior at run time.

## Static vs dynamic binding

Module 05 ended with a non-virtual `describe()` that ignored the real object. The keyword `virtual` changes that:

~~~cpp
class Animal {
public:
    virtual ~Animal() = default;                       // see "Virtual destructors"
    virtual std::string sound() const { return "..."; }
    std::string kind() const { return "animal"; }      // not virtual
};
class Dog : public Animal {
public:
    std::string sound() const override { return "Woof"; }
    std::string kind() const { return "dog"; }         // hides, never overrides
};

Dog rex;
Animal& a = rex;    // static type Animal, dynamic type Dog
a.sound();          // "Woof":   virtual, so the dynamic type decides
a.kind();           // "animal": non-virtual, so the static type decides
Animal* p = &rex;
p->sound();         // "Woof":   pointers behave like references
a.Animal::sound();  // "...":    a qualified call switches dispatch off
~~~
~~~python
class Animal:
    def sound(self):
        return "..."

class Dog(Animal):
    def sound(self):
        return "Woof"

rex = Dog()
a: Animal = rex
a.sound()           # 'Woof': lookup always starts at type(a)
Animal.sound(rex)   # '...':  naming the class explicitly skips dispatch
~~~

- The **static type** is the type of the expression as written; the **dynamic type** is the type of the complete object it refers to, known at run time.
- A call is dispatched dynamically only when the function is **virtual** *and* called through a **pointer or reference**. A qualified call (`Animal::sound()`) never is: that is how an override reuses the base version.
- Once virtual, always virtual: a derived function with the same name, parameter types and `const`/reference qualifiers **overrides** the base one and is itself virtual, keyword or not.

## `override` and `final`

An override must match the base signature exactly; get one detail wrong and you declare a *new* function that hides the base one:

~~~cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual void draw() const;
};
class Circle : public Shape {
public:
    void draw();               // no const: a NEW function; Shape::draw is hidden
    void draw() const final;   // checked override; no further overriding allowed
};
// void draw() override;
//   error: 'void Circle::draw()' marked 'override', but does not override
class Ring : public Circle {
    void draw() const override;
    // error: virtual function 'virtual void Ring::draw() const' overriding final function
};
~~~
~~~python
from typing import final, override   # override: Python 3.12+

class Shape:
    def draw(self): ...

class Circle(Shape):
    @final
    @override
    def draw(self): ...   # fine

    @override
    def drow(self): ...   # mypy/pyright report an error; at run time
                          # @override only sets drow.__override__ = True
~~~

Without `override`, `Shape& s = circle; s.draw();` quietly runs `Shape::draw`. Recent GCC warns under `-Wall` (*'virtual void Shape::draw() const' was hidden*), but warnings get missed; `override` makes it a hard error. Write `virtual` once, in the base, and `override` (or `final`) on every override, without repeating `virtual`, so the compiler checks each one.

`final` on a virtual function stops further overriding (on a class, it forbids derivation). Only virtual functions can be `final`, and it lets the compiler call `Circle::draw` directly through a `Circle&`. Python's `@final` and `@override` are advisory: only type checkers enforce them.

## Under the hood: vtables

The standard specifies only behavior and never mentions vtables, but mainstream compilers all work like this:

~~~text
rex (a Dog object)           Dog's vtable: one per class, shared
+--------------+             +------------------+
| vptr --------+-----------> | &Dog::~Dog       |
| Animal part  |             | &Dog::sound      |
| Dog part     |             +------------------+
+--------------+
~~~

- Each polymorphic class has a **vtable**: a static array of pointers to that class's final overriders, one slot per virtual function.
- Each object holds a hidden **vptr** to its class's vtable: one vtable per class, one vptr per object (more under multiple inheritance).
- `p->sound()` becomes: load the vptr from `*p`, load the `sound` slot, call it with `p` as `this`.

**Cost:** an indirect call, usually not inlinable unless the compiler proves the dynamic type (*devirtualization*, which `final` helps), plus one pointer per object. It matters only in hot loops over many tiny objects.

**Constructors cannot be virtual** (*constructors cannot be declared 'virtual'*): dispatch needs an existing object with a vptr, and creating one means naming its exact type. To copy an object of unknown dynamic type, use a virtual `clone()` (Module 10).

**Virtual calls in constructors and destructors** reach the class whose constructor or destructor is running: during `Base()` the `Derived` part does not exist yet, and during `~Base()` it is already gone, so the object behaves as a `Base`. Python differs:

~~~cpp
struct Base {
    Base() { hello(); }               // Base::hello
    virtual ~Base() { hello(); }      // Base::hello again
    virtual void hello() const { std::cout << "Base\n"; }
};
struct Derived : Base {
    std::string name = "Derived";
    void hello() const override { std::cout << name << '\n'; }
};

{ Derived d; d.hello(); }   // prints Base, Derived, Base
~~~
~~~python
class Base:
    def __init__(self):
        self.hello()      # dispatches to Derived.hello!

    def hello(self):
        print("Base")

class Derived(Base):
    def __init__(self):
        super().__init__()
        self.name = "Derived"

    def hello(self):
        print(self.name)

Derived()  # AttributeError: 'Derived' object has no attribute 'name'
~~~

> **C++ vs Python:** A Python object's class is fixed once `__new__` creates it, so a base `__init__` runs the override *before* the subclass has set itself up. Avoid calling overridable methods during construction in both languages (calling a *pure* virtual one in C++ is undefined behavior, Module 07).

## Virtual destructors

`delete` on a `Base*` must find the real object's destructor, so it needs dispatch too:

~~~cpp
class Animal {
public:
    virtual ~Animal() = default;   // the rule for polymorphic bases
    virtual std::string sound() const { return "..."; }
};
class Dog : public Animal {
    std::vector<std::string> tricks_;   // must be destroyed by ~Dog
public:
    std::string sound() const override { return "Woof"; }
};

std::unique_ptr<Animal> p = std::make_unique<Dog>();
// at scope exit: delete through Animal*, so ~Dog runs, then ~Animal
~~~
~~~python
class Animal:
    def __del__(self):
        print("Animal cleanup")

class Dog(Animal):
    def __del__(self):   # looked up on type(obj), like any method
        print("Dog cleanup")
        super().__del__()

a: Animal = Dog()
del a   # CPython: Dog cleanup, Animal cleanup
~~~

Without the virtual destructor, deleting a `Dog` through an `Animal*` (or a `std::unique_ptr<Animal>`) is **undefined behavior**: typically `~Dog` is skipped and `tricks_` leaks, but nothing is guaranteed. GCC's `-Wdelete-non-virtual-dtor` (in `-Wall`) catches some cases.

**The rule:** a class used through base pointers gets a **public virtual destructor** (or, if it must never be deleted through one, a protected non-virtual one). `std::has_virtual_destructor_v<Animal>` checks it.

> **Pitfall:** "My base has no data, so it needs no virtual destructor" is wrong: the danger is the *derived* destructor not running.

## Slicing revisited

A by-value copy of the base part is a genuine `Animal` with `Animal`'s vptr, so even virtual calls run `Animal`'s versions:

~~~cpp
void speak(Animal a)           { std::cout << a.sound(); }  // "...": sliced copy
void speakRef(const Animal& a) { std::cout << a.sound(); }  // "Woof"

std::vector<Animal> zoo;
zoo.push_back(Dog{});          // sliced on the way in: zoo[0].sound() is "..."

std::vector<std::unique_ptr<Animal>> pets;   // owns objects of any dynamic type
pets.push_back(std::make_unique<Dog>());
for (const auto& pet : pets) std::cout << pet->sound();   // "Woof"
~~~
~~~python
pets = [Dog(), Cat()]   # a list holds references: nothing is copied
for pet in pets:
    print(pet.sound())  # Woof, Meow
~~~

Hold polymorphic objects through `std::unique_ptr<Base>` (owning) or `Base*`/`Base&`. Deleting a polymorphic base's copy operations turns accidental slicing into a compile error.

## Python: every method is "virtual"

Python looks methods up on `type(obj)` at every call, so every method acts like a C++ virtual function; only an explicit `Base.method(obj)` call or a name-mangled `__method` escapes dispatch. It does not even need a common base: with **duck typing**, any object with the right method will do. The closest C++ equivalent is a template, checked at compile time for each type:

~~~cpp
struct Duck  { std::string speak() const { return "Quack"; } };
struct Robot { std::string speak() const { return "Beep"; } };  // unrelated

template <typename T>
void talk(const T& t) { std::cout << t.speak() << '\n'; }

talk(Duck{});    // Quack
talk(Robot{});   // Beep
// But a std::vector holding "a Duck or a Robot" at run time
// needs a common base with a virtual speak().
~~~
~~~python
class Duck:
    def speak(self): return "Quack"

class Robot:              # unrelated to Duck
    def speak(self): return "Beep"

for thing in [Duck(), Robot()]:
    print(thing.speak())  # Quack, Beep: one loop, no base class
~~~

When an object might lack the method, Python style prefers **EAFP** ("easier to ask forgiveness than permission") to **LBYL** ("look before you leap"):

~~~python
if hasattr(thing, "speak"):   # LBYL: check first
    print(thing.speak())

try:                          # EAFP: just try it
    speak = thing.speak       # only the lookup is inside try
except AttributeError:
    print("silent")
else:
    print(speak())
~~~

> **Pitfall:** `try: thing.speak()` / `except AttributeError:` also catches an `AttributeError` raised *inside* `speak()`, disguising a bug as "has no speak method". Keep only the lookup in the `try`.

## Replacing type switches with polymorphism

The recipe: (1) give the base a virtual function for the operation, (2) move each `case` body into the matching class's override, (3) replace the switch with a call.

~~~cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0; }  // Module 07: make it pure virtual
};
class Circle : public Shape {
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159 * r_ * r_; }
private:
    double r_;
};
// class Rect : public Shape { ... area() returns w_ * h_ ... };

for (const auto& s : shapes)      // std::vector<std::unique_ptr<Shape>>
    std::cout << s->area() << '\n';
~~~
~~~python
class Circle:
    def __init__(self, r):
        self.r = r

    def area(self):
        return 3.14159 * self.r ** 2

for s in shapes:   # Circle, Rect, ... objects
    print(s.area())
~~~

Adding a `Triangle` is now one new class and zero edits elsewhere (the open/closed principle, Module 18). The trade-off: a new *operation* touches every class. If the types are fixed but operations keep growing, `std::variant` + `std::visit` (or Python's `match`) may fit better.

## Type checks as a smell

~~~cpp
void play(Animal& a) {
    if (auto* d = dynamic_cast<Dog*>(&a)) d->fetch();    // nullptr if not a Dog
    else if (auto* c = dynamic_cast<Cat*>(&a)) c->chaseLaser();
}
// dynamic_cast<Dog&>(a) throws std::bad_cast instead of returning nullptr
~~~
~~~python
def play(a):
    if isinstance(a, Dog):
        a.fetch()
    elif isinstance(a, Cat):
        a.chase_laser()
~~~

This is the type switch again: every new animal needs another branch. Give `Animal` a virtual `play()` and let each class answer. `dynamic_cast` reads run-time type information found through the vptr, so a downcast needs a polymorphic source (otherwise: *source type is not polymorphic*). It has legitimate uses, such as asking whether an object also supports an optional interface, but a chain of casts or `isinstance` checks means a virtual function is missing.

## Key takeaways

- Runtime polymorphism: one call site, behavior chosen by the object's **dynamic type**.
- C++ dispatches only **virtual** functions called through a **pointer or reference**; all else binds to the static type.
- Mark every override `override`; use `final` to stop further overriding.
- Typical implementation: a **vtable** per class, a **vptr** per object. In constructors and destructors, calls reach the class currently being built or destroyed.
- A polymorphic base needs a **public virtual destructor** (or a protected non-virtual one).
- Copying into a base **value** slices: store `std::unique_ptr<Base>`, never `Base`, in containers.
- Every Python method dispatches dynamically, and duck typing needs no common base.
- `switch`/`dynamic_cast`/`isinstance` chains on type usually mean a virtual method is missing.

## Common pitfalls

- A signature mismatch (missing `const`, `int` vs `long`) that hides instead of overrides; `override` catches it.
- Deleting a derived object through a base pointer without a virtual destructor: undefined behavior.
- Expecting a virtual call in a C++ constructor to reach the derived class (in Python it does, too early).
- `std::vector<Base>` or by-value `Base` parameters, which slice every derived object.
- Wrapping a whole call in `try/except AttributeError`, hiding bugs inside the method.
- `dynamic_cast`/`isinstance` ladders that must be edited for every new type.
