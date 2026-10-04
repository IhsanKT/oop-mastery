## Why inheritance?

Picture a vet clinic app: `Dog` has a name, `describe()` and `vaccinate()`, and you copy most of it into `Cat` and `Rabbit`. Now a bug in `vaccinate()` must be fixed three times, and booking needs three functions, because nothing says "these are all animals". Inheritance fixes both: write the shared part once in `Animal`, and declare that a `Dog` **is an** `Animal`. That gives you two different things:

- **Reuse (implementation inheritance).** The derived class gets the base's data members and member functions.
- **Subtyping (interface inheritance).** A derived object can be used wherever a base object is expected: a `Dog&` converts to `Animal&`, and `isinstance(dog, Animal)` is `True`. Code written once for `Animal` works for every animal, even kinds written later.

Subtyping is the real reason to inherit; reuse alone is better done with **composition** (one object inside another). Use public inheritance only for **is-a** relationships where the derived class honors everything the base promises: a `Dog` is an `Animal`, but a `Car` *has an* `Engine`. Ask: *"Will all code written for the base work with the derived object?"* If the answer is "only if nobody calls X", do not inherit.

## Syntax side by side

~~~cpp
class Animal {
public:
    std::string name;
    void eat() const { std::cout << name << " eats\n"; }
};

class Dog : public Animal {          // Dog is-an Animal
public:
    void bark() const { std::cout << name << " says woof\n"; }
};

Dog rex;
rex.name = "Rex";   // inherited data member
rex.eat();          // inherited: "Rex eats"
Animal& a = rex;    // a Dog can stand in for an Animal
~~~
~~~python
class Animal:
    def __init__(self, name):
        self.name = name

    def eat(self):
        print(f"{self.name} eats")

class Dog(Animal):                   # Dog is-an Animal
    def bark(self):
        print(f"{self.name} says woof")

rex = Dog("Rex")   # Dog has no __init__, so Animal.__init__ runs
rex.eat()          # inherited: "Rex eats"
~~~

> **C++ vs Python:** Python finds `__init__` by ordinary attribute lookup, so a subclass without one uses the base's. C++ constructors are **not** inherited by default: `Dog` needs its own, or `using Animal::Animal;`.

> **Under the hood:** A C++ `Dog` physically contains a complete `Animal` **base-class subobject** (the layout is implementation-specific). A Python `Dog` keeps all its attributes in one `__dict__`; methods are found by walking `Dog.__mro__`, i.e. `(Dog, Animal, object)`. Every Python class inherits from `object`; C++ has no universal base.

## Constructor chaining

A derived object is built on top of a finished base, so the base's setup must run first.

~~~cpp
class Animal {
public:
    explicit Animal(std::string name) : name_(std::move(name)) {}
private:
    std::string name_;
};

class Dog : public Animal {
public:
    Dog(std::string name, std::string breed)
        : Animal(std::move(name)),     // 1. the base subobject
          breed_(std::move(breed)) {}  // 2. members, in declaration order
                                       // 3. then the constructor body
private:
    std::string breed_;
};
~~~
~~~python
class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)   # run Animal's setup on this same object
        self.breed = breed

class BrokenDog(Animal):
    def __init__(self, name, breed):
        self.breed = breed       # forgot super().__init__(name)

d = BrokenDog("Rex", "beagle")   # no error here...
d.name   # AttributeError: 'BrokenDog' object has no attribute 'name'
~~~

The C++ rules:

- The base constructor is chosen in the **member-initializer list**; by the time the body runs, the base already exists.
- Construction order is always **bases → members in declaration order → body**, whatever order the list uses (GCC's `-Wreorder`, in `-Wall`, flags a mismatch).
- Destruction is the **exact reverse**: derived body, members, then the base destructor (called automatically).
- With no base constructor named, the base's default constructor is used. Declaring `Animal(std::string)` suppresses the implicit one, so a `Dog` constructor without `: Animal(...)` fails: *no matching function for call to 'Animal::Animal()'*.

> **Pitfall:** Once a subclass defines `__init__`, Python never calls the base one for you. Forgetting `super().__init__(...)` is silent until an `AttributeError` appears later, far from the mistake.

> **Note:** `super()` in class `C` means "the next class after `C` in `type(self).__mro__`", not just "my parent"; Module 12 shows when that differs.

## Overriding and reusing base behavior

A derived class can **redefine** an inherited function to specialize it. Good redefinitions *extend* the base version instead of copying it.

~~~cpp
class Animal {
public:
    // constructor and name_ as above
    std::string describe() const { return name_ + " is an animal"; }
};

class Dog : public Animal {
public:
    // constructor and breed_ as above
    std::string describe() const {
        return Animal::describe() + " (a " + breed_ + ")";  // qualified call
    }
};
~~~
~~~python
class Animal:
    # __init__ as above
    def describe(self):
        return f"{self.name} is an animal"

class Dog(Animal):
    # __init__ as above
    def describe(self):
        return super().describe() + f" (a {self.breed})"
~~~

> **Pitfall:** Inside `Dog::describe`, an unqualified `describe()` calls `Dog::describe` again: infinite recursion. `self.describe()` does the same in Python (`RecursionError`). Write `Animal::describe()` or `super().describe()`.

### Name hiding in C++

C++ looks a name up **before** overload resolution, and the search stops at the first scope that declares it. So *any* `f` in `Derived` hides *every* `f` in `Base`, whatever the parameter types:

~~~cpp
struct Base {
    void f(double x) { std::cout << "Base::f " << x << '\n'; }
};
struct Derived : Base {
    void f(int x) { std::cout << "Derived::f " << x << '\n'; }
    // using Base::f;  // un-hides it: d.f(1.5) would pick Base::f(double)
};

Derived d;
d.f(1.5);        // "Derived::f 1": Base::f is not even a candidate
d.Base::f(1.5);  // "Base::f 1.5": a qualified call bypasses hiding
~~~
~~~python
class Base:
    def f(self, x): ...

class Derived(Base):
    def f(self, x, y): ...   # no overloading in Python: replaces f entirely

Derived().f(1)   # TypeError: Derived.f() missing 1 required positional argument: 'y'
~~~

### Hidden, not overridden

These `describe` functions are **not virtual**, so C++ picks one from the **static type** of the expression: a `Dog` seen through an `Animal&` runs `Animal::describe`. Python always looks methods up on the object's actual class.

~~~cpp
Dog rex("Rex", "beagle");
Animal& a = rex;
a.describe();     // "Rex is an animal": static type Animal
rex.describe();   // "Rex is an animal (a beagle)"
~~~
~~~python
rex = Dog("Rex", "beagle")
a: Animal = rex   # the annotation changes nothing at run time
a.describe()      # 'Rex is an animal (a beagle)': lookup starts at type(a)
~~~

Declaring `describe` `virtual` gives C++ the Python behavior: **runtime polymorphism**, the topic of Module 06.

## Access: protected and inheritance modes

A `protected` member can be used by the class, its friends and its derived classes, but not by outside code.

~~~cpp
class Account {
public:
    double balance() const { return balance_; }
protected:
    double balance_ = 0;   // derived classes may use it
private:
    int pin_ = 0;          // Account (and friends) only
};

class Savings : public Account {
public:
    void addInterest(double rate) { balance_ += balance_ * rate; }  // OK
    // void zero(Account& other) { other.balance_ = 0; }   // error: see below
};
~~~
~~~python
class Account:
    def __init__(self):
        self._balance = 0   # "protected" by convention only
        self.__pin = 0      # name-mangled to self._Account__pin

class Savings(Account):
    def add_interest(self, rate):
        self._balance += self._balance * rate   # fine (outsiders could too)
~~~

> **Pitfall:** A derived class may use a protected member only **through objects of its own type** (or its subclasses). `Savings` can touch its own `balance_`, not that of any `Account&`, which might be an unrelated subclass.

The keyword in front of the base caps the visibility of what is inherited:

| Member in base | `: public Base` | `: protected Base` | `: private Base` |
|---|---|---|---|
| `public` | public | protected | private |
| `protected` | protected | protected | private |
| `private` | inaccessible | inaccessible | inaccessible |

Private base members are still **inherited** (they live inside every derived object); derived code just cannot name them. Under protected or private inheritance, outside code cannot even convert `Derived&` to `Base&`: the is-a is hidden, so these modes mean "implemented in terms of" and are rarely right. Without a keyword, `struct D : B` inherits **publicly** and `class D : B` **privately** (the derived class's keyword decides).

> **C++ vs Python:** Python has no access control. A leading underscore (`_balance`) is a convention: "internal; subclasses may use it". A double underscore (`__pin`) triggers **name mangling** to `_Account__pin`, which avoids clashes with subclass attributes; it is not privacy.

## Object slicing

In C++ a variable of class type *is* an object of exactly that type. Passing or assigning a `Dog` **by value** to an `Animal` copies only the `Animal` part, via `Animal`'s copy constructor, which knows nothing about `breed_`.

~~~cpp
void show(Animal a) { std::cout << a.describe() << '\n'; }            // slices
void showRef(const Animal& a) { std::cout << a.describe() << '\n'; }  // no copy

Dog rex("Rex", "beagle");
show(rex);          // a is a new Animal copied from rex's Animal part
Animal copy = rex;  // sliced too: breed_ is gone for good
showRef(rex);       // a refers to rex itself
~~~
~~~python
def show(a):        # a is a second name for the caller's object
    print(a.describe())

rex = Dog("Rex", "beagle")
show(rex)           # Rex is an animal (a beagle)
same = rex
same is rex         # True: assignment never copies
~~~

Python cannot slice: variables are references, and passing or assigning never copies. In C++, pass objects of a hierarchy **by reference or pointer**. `showRef(rex)` still prints `Rex is an animal` because `describe` is non-virtual: references prevent slicing; `virtual` (Module 06) adds dynamic dispatch.

## Checking relationships

~~~cpp
static_assert(std::is_base_of_v<Animal, Dog>);        // compile time, about types
static_assert(std::is_base_of_v<Dog, Dog>);           // a class is its own base
static_assert(std::is_convertible_v<Dog*, Animal*>);  // public, unambiguous base only
// dynamic_cast<Dog*>(p): nullptr if *p is not a Dog; needs a polymorphic base (Module 06)
~~~
~~~python
rex = Dog("Rex", "beagle")
isinstance(rex, Animal)          # True: follows inheritance
issubclass(Dog, Dog)             # True: a class is its own subclass
isinstance(rex, (int, Animal))   # True: "an instance of any of these"
type(rex) is Animal              # False: exact class only
issubclass(bool, int)            # True: bool really inherits from int
~~~

`std::is_base_of_v` is true even for private or ambiguous bases. `type(x) is C` checks the **exact** class and rejects subclasses, breaking substitutability; prefer `isinstance`, or better, call a method instead of checking types.

## Stopping inheritance

~~~cpp
class Token final { /* ... */ };   // no class may derive from Token
// class Special : public Token {}; // error: cannot derive from 'final' base 'Token'
~~~
~~~python
from typing import final

@final
class Token: ...

class Special(Token): ...   # runs fine! Only type checkers (mypy, pyright) object
~~~

C++ `final` is enforced by the compiler; on a virtual function it stops further overriding (Module 06). `typing.final` is **advisory**: at run time it only sets `Token.__final__ = True`. To really forbid subclassing, raise `TypeError` in the base's `__init_subclass__`.

## Designing hierarchies

- **Keep hierarchies shallow.** Every level adds behavior a reader must trace.
- **Substitutability (Liskov, Module 18).** Code written for the base must work, unchanged, with any derived object. A square is a rectangle in math, but a *mutable* `Square` that keeps its sides equal breaks `Rectangle`'s promise that width and height change independently:

~~~cpp
void stretch(Rectangle& r) {
    r.setWidth(10);
    r.setHeight(2);
    assert(r.area() == 20);   // fails if r is a Square that keeps its sides equal
}
~~~
~~~python
def stretch(r):
    r.width = 10
    r.height = 2
    assert r.area() == 20     # fails if r is a Square that keeps its sides equal
~~~

- **Inherit for substitutability, compose for reuse.** `class Stack(list)` (or `: public std::vector<int>`) inherits `insert`, indexing and more, so any caller can break last-in-first-out order. A stack *has* a list; it is not one (more in Module 17):

~~~cpp
class Stack {
public:
    void push(int x) { items_.push_back(x); }
    int pop() { int x = items_.back(); items_.pop_back(); return x; }  // precondition: not empty
private:
    std::vector<int> items_;   // has-a
};
~~~
~~~python
class Stack:
    def __init__(self):
        self._items = []       # has-a

    def push(self, x):
        self._items.append(x)

    def pop(self):
        return self._items.pop()   # IndexError when empty
~~~

## Key takeaways

- Public inheritance models **is-a**: a derived object must work wherever the base does. Use composition for **has-a** and reuse.
- C++ builds **base → members (declaration order) → body** and destroys in reverse; the base constructor goes in the initializer list.
- Python runs the base `__init__` only if you call `super().__init__(...)` (or define no `__init__`).
- Extend base behavior with `Base::f()` / `super().f()` instead of copying it.
- In C++, a derived `f` hides **all** base overloads of `f`, and non-virtual calls follow the static type.
- C++ `protected` is enforced; Python's `_name` is a convention. `struct` inherits publicly by default, `class` privately.
- Passing a derived object **by value** in C++ slices it; Python never slices.
- `is_base_of_v`, `isinstance` and `issubclass` follow inheritance; `type(x) is C` does not.

## Common pitfalls

- Forgetting the base constructor: a C++ compile error if the base has no default constructor, a delayed `AttributeError` in Python.
- Calling `describe()` / `self.describe()` inside an override instead of the base version: infinite recursion.
- Adding an overload in a derived C++ class and hiding all the base overloads.
- Taking a base class **by value** (`void f(Animal a)`), which slices derived objects.
- Inheriting from a container just to reuse its code (`class Stack(list)`), exposing operations that break invariants.
- Writing `type(x) is Base` in checks, which rejects every subclass.
