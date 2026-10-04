## Why classes?

Module 01 described an object as **state + behavior + identity**. Try building that without classes: each dog in a dog-walking app is a loose `name` and `age` (variables, or a dict), and `speak(name)` and `birthday(age)` are free functions hoping to receive the right pieces. Nothing stops a caller from passing a cat's age to a dog function or typing `"agee"` as a dict key.

A **class** fixes this by defining a new **type**: the data each object carries (**data members**, or **attributes**) plus the operations on it (**member functions**, or **methods**). Each **object** (**instance**) has its own copy of the data and shares the methods.

## Anatomy of a class

~~~cpp
class Dog {
public:                        // usable from outside (Module 04)
    std::string name;          // data members: each Dog has its own
    int age = 0;

    Dog(std::string n, int a) : name(n), age(a) {}   // constructor

    void speak() const { std::cout << name << " says woof\n"; }
    void birthday() { age += 1; }
};

Dog rex("Rex", 3);   // an object (instance) of Dog
rex.speak();         // Rex says woof
rex.birthday();      // rex.age is now 4
~~~
~~~python
class Dog:
    def __init__(self, name, age):
        self.name = name             # instance attributes: each Dog has its own
        self.age = age

    def speak(self):
        print(f"{self.name} says woof")

    def birthday(self):
        self.age += 1

rex = Dog("Rex", 3)  # an object (instance) of Dog
rex.speak()          # Rex says woof
rex.birthday()       # rex.age is now 4
~~~

A C++ class lists its data members up front, with types, so the compiler knows exactly what every `Dog` contains. A Python class has no list of data: attributes come into existence when `__init__` assigns `self.name = ...`. (Module 03 covers constructors and `__init__`.)

## `this` and `self`: which object?

One `speak` function serves all dogs, so how does it know *which* dog's name to print? Each call hands it the object.

~~~cpp
class Dog {
public:
    std::string name;
    void speak() const { std::cout << name; }   // name means this->name
    void setName(const std::string& name) {
        this->name = name;   // parameter hides the member; this-> reaches it
    }
};

Dog a{"Rex"}, b{"Fido"};
a.speak();   // inside speak, this == &a
b.speak();   // inside speak, this == &b
~~~
~~~python
class Dog:
    def __init__(self, name):
        self.name = name

    def speak(self):
        print(self.name)   # a bare `name` would be a NameError

d = Dog("Rex")
d.speak()      # Python passes d as self...
Dog.speak(d)   # ...so this is exactly the same call
~~~

C++ passes a hidden pointer `this` to every non-static member function; a bare member name means `this->name`, and `*this` is the object itself. Python makes the object an *explicit* first parameter: `d.speak()` finds `speak` on the class and calls `Dog.speak(d)`. `self` is a convention, not a keyword, and every attribute is written `self.name`.

> **Under the hood:** `d.speak` (no parentheses) is a **bound method** remembering the function and `d` (`d.speak.__self__ is d`); calling it inserts `d` first. In C++, `std::invoke(&Dog::speak, d)` is the same call as `d.speak()`.

> **Pitfall:** Forget `self` (`def speak():`) and every call fails, because `d.speak()` passes `d` anyway: `TypeError: Dog.speak() takes 0 positional arguments but 1 was given`.

### `const` member functions

A `const` after the parameter list promises not to modify the object: inside, `this` has type `const Dog*`, so the object's members are read-only. Only `const` member functions can be called on a `const` object or through a `const Dog&`, so mark every function that does not change the object `const` (more in Module 13).

~~~cpp
struct Dog {
    int age = 0;
    int getAge() const { return age; }    // only reads: mark it const
    void grow() { age += 1; }
    // void oops() const { age += 1; }    // error: assignment of member 'Dog::age' in read-only object
};

const Dog old{};
old.getAge();    // OK
// old.grow();   // error: passing 'const Dog' as 'this' argument discards qualifiers
~~~
~~~python
class Dog:
    def get_age(self):   # Python has no const methods:
        self.age += 1    # a "getter" may change self, and nothing checks
        return self.age
~~~

### Returning `*this`: method chaining

~~~cpp
struct Counter {
    int value = 0;
    Counter& add(int n) { value += n; return *this; }   // a reference to me
};

Counter c;
c.add(2).add(3);   // the second add runs on c itself: c.value == 5
~~~
~~~python
class Counter:
    def __init__(self):
        self.value = 0

    def add(self, n):
        self.value += n
        return self      # the very same object

c = Counter()
c.add(2).add(3)  # c.value == 5
~~~

> **Pitfall:** `Counter add(int n)` (return **by value**) still compiles, but `c.add(2).add(3)` then adds 3 to a temporary *copy*, destroyed at the end of the statement: `c.value` is 2.

## Defining member functions outside the class

C++ projects put the class definition in a **header** and the function bodies in a **source file**.

~~~cpp
// dog.h
#pragma once
#include <string>
class Dog {
public:
    std::string name;
    void speak() const;     // declaration only
};

// dog.cpp
#include "dog.h"
#include <iostream>
void Dog::speak() const {   // "the speak that belongs to Dog"
    std::cout << name << " says woof\n";   // name means this->name
}
~~~
~~~python
# dog.py: no headers; the class body holds every method
class Dog:
    def speak(self):
        print(f"{self.name} says woof")

# elsewhere: from dog import Dog
~~~

- Files using `Dog` include `dog.h` (`#pragma once` prevents double inclusion); `dog.cpp` is compiled once and linked in.
- `::` is the **scope resolution operator**. Without `Dog::` you define an unrelated free function `speak`: GCC reports *'name' was not declared in this scope* (and, because of the `const`, *non-member function 'void speak()' cannot have cv-qualifier*). Had the body compiled, calls to `rex.speak()` would fail to link: *undefined reference to `Dog::speak() const'*.
- The definition must match the declaration exactly, trailing `const` included.
- Members defined *inside* the class body are implicitly `inline`, so they may live in a header. One defined outside the class *in a header* needs `inline`, or two files including it cause a multiple-definition link error.

## Instance vs class attributes

Most data belongs to one object; some belongs to the class as a whole, like a count of objects.

~~~cpp
struct A {
    static inline int count = 0;   // ONE variable for the whole class (Module 09)
    int id = 0;                    // one per object
};

A a, b;
a.count = 5;    // assigns the one A::count: no per-object copy appears
std::cout << A::count << ' ' << a.count << ' ' << b.count;   // 5 5 5
~~~
~~~python
class A:
    count = 0                      # class attribute: stored on the class

a, b = A(), A()
print(a.count)                     # 0: not on a, so found in A
a.count = 5                        # creates a.__dict__['count']
print(A.count, a.count, b.count)   # 0 5 0
print(vars(a), vars(b))            # {'count': 5} {}
~~~

Reading `a.count` follows a fixed **lookup order**: the object's own namespace `a.__dict__`, then its class (then base classes, Module 05). **Assignment is different:** `a.count = 5` never touches the class; it creates an attribute on `a` that **shadows** the class attribute for `a` alone. `vars(a)` returns `a.__dict__`. To update shared data, assign through the class (`A.count += 1`); `self.count += 1` reads the class value but assigns to the instance.

The worst version of the trap is a **mutable** class attribute:

~~~cpp
struct Cart {
    std::vector<std::string> items;   // one vector per Cart; sharing needs static
};
~~~
~~~python
class Cart:
    items = []                   # ONE list, created when the class is defined

    def add(self, item):
        self.items.append(item)  # finds the class's list and mutates it

a, b = Cart(), Cart()
a.add("apple")
print(b.items)                   # ['apple']: b sees a's item!
# Fix: self.items = [] in __init__ (a new list per object)
~~~

`self.items.append(...)` *reads* `self.items` and mutates the list it finds; nothing is assigned, so no shadow appears. Keep class attributes for constants and truly shared data.

> **Under the hood:** One step precedes the instance dict: a *data descriptor* on the class, such as a `@property` (Module 04), wins. Module 14 covers descriptors.

## `struct` vs `class`

In C++ they define the same kind of type; the **only** difference is default access: members (and base classes) are `public` by default in a `struct` and `private` in a `class`.

~~~cpp
struct Point { int x = 0, y = 0; };   // public by default

class Account {                       // private by default
    double balance = 0;
public:
    double getBalance() const { return balance; }
};

Point p{1, 2};
p.x = 5;                 // OK
// Account acct; acct.balance = 9;  // error: 'double Account::balance' is private within this context
~~~
~~~python
from dataclasses import dataclass

@dataclass
class Point:             # the closest thing to a plain struct (Module 14)
    x: int = 0
    y: int = 0

p = Point(1, 2)
p.x = 5                  # Python enforces no access control
~~~

By convention, `struct` holds plain public data with no rules to protect, and `class` guards an **invariant** behind private members (Module 04).

## Dynamic attributes vs fixed layout

~~~cpp
struct Dog { std::string name; int age = 0; };

Dog rex{"Rex", 3};
// rex.nickname = "R";   // error: 'struct Dog' has no member named 'nickname'
~~~
~~~python
rex, fido = Dog("Rex", 3), Dog("Fido", 5)
rex.nickname = "R"   # fine: adds an attribute to rex only
vars(fido)           # {'name': 'Fido', 'age': 5}
rex.agee = 4         # typo: silently a NEW attribute; rex.age is still 3
~~~

A C++ class fixes its members at compile time: the compiler knows each object's size and where every member sits (its **layout**), so a misspelled member is a compile error. A Python object normally keeps its attributes in a per-object dict, so attributes can be added (or removed with `del`) at any time, and two instances may differ. Typos become silent bugs, so create every attribute in `__init__`; `__slots__` (Module 14) can enforce a fixed set.

## Printing objects

~~~cpp
std::ostream& operator<<(std::ostream& os, const Point& p) {   // free function
    return os << "(" << p.x << ", " << p.y << ")";
}

std::cout << Point{1, 2} << '\n';   // (1, 2); without operator<< it won't compile
~~~
~~~python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __repr__(self):        # for developers: unambiguous, code-like
        return f"Point({self.x}, {self.y})"

    def __str__(self):         # for users: readable
        return f"({self.x}, {self.y})"

p = Point(1, 2)
print(p)     # (1, 2)         print(), str() and f-strings use __str__
print([p])   # [Point(1, 2)]  containers show their items' __repr__
~~~

`__repr__` also serves `repr()`, the interactive prompt and debuggers. With only `__repr__`, `str()` uses it too (not the reverse); with neither you get `<__main__.Point object at 0x...>`. C++ has no default printing: `operator<<` returns the stream so that `std::cout << a << b` chains (Module 08).

## Objects as function arguments

~~~cpp
void byValue(Dog d)     { d.age = 99; }            // a copy: caller unchanged
void byRef(Dog& d)      { d.age = 99; }            // the caller's dog: changed
void show(const Dog& d) { std::cout << d.name; }   // no copy, read-only

Dog rex{"Rex", 3};
byValue(rex);   // rex.age == 3
byRef(rex);     // rex.age == 99
~~~
~~~python
def mutate(d):
    d.age = 99          # mutates the caller's object

def rebind(d):
    d = Dog("Max", 1)   # rebinds the local name only

rex = Dog("Rex", 3)
rebind(rex)     # rex is still Rex, age 3
mutate(rex)     # rex.age == 99
~~~

In C++, **by value** the parameter is a new copy: changes stay local, and large copies cost time. **By reference** it is another name for the caller's object. **By const reference** there is no copy and no modification: the default for class-type parameters you only read.

Python has one rule, **call by sharing**: the parameter is a new name bound to the *same* object. Mutating the object is visible to the caller; rebinding the name is not. Python never copies implicitly (Module 10).

> **C++ vs Python:** Assigning to a C++ reference does **not** rebind it: inside `byRef`, `d = Dog{"Max", 1};` overwrites *the caller's object* with Max. The same line in Python only repoints the local name.

## Method or free function?

Make a function a **member** when it needs private data or maintains the invariant. If the public interface suffices, a **free function** keeps the class smaller and treats all arguments alike (C++ Core Guidelines C.4).

~~~cpp
class Circle {
public:
    Circle(double r) : r_(r) {}
    double radius() const { return r_; }   // needs r_: a member
private:
    double r_;
};
bool isLarger(const Circle& a, const Circle& b) { return a.radius() > b.radius(); }
~~~
~~~python
class Circle:
    def __init__(self, r):
        self.r = r

def is_larger(a, b):   # module-level functions are idiomatic: len(), sorted()...
    return a.r > b.r
~~~

## Key takeaways

- A class defines a type: per-object data (members / attributes) plus shared behavior (member functions / methods).
- A method receives its object: the hidden `this` in C++ (`const Dog*` in a `const` member function), the explicit `self` in Python. `d.speak()` is `Dog.speak(d)`.
- C++ declares the class in a header and defines members as `Dog::speak` in a source file.
- Python reads `obj.attr` from the instance, then the class; `obj.attr = ...` writes to the instance, shadowing the class attribute. `vars(obj)` shows the instance's own attributes.
- Per-object mutable state goes in `__init__` or ordinary data members, never in a class attribute or `static` member.
- `struct` and `class` differ only in default access. C++ members are fixed at compile time; Python objects can gain attributes at run time.
- `__str__` is for users, `__repr__` for developers and containers; C++ prints through `operator<<`.
- C++ passes by value, reference or const reference; Python passes by sharing.

## Common pitfalls

- Leaving `self` out of a method's parameters, or writing `name` instead of `self.name`.
- Defining `void speak()` instead of `void Dog::speak()` in the source file.
- A mutable class attribute (`items = []`) shared by every instance, or `self.count += 1` creating a shadow instead of updating the class counter.
- Returning `*this` by value, so chained calls modify a temporary copy.
- Taking an object by value when the function must modify the caller's object, or when `const&` would avoid a copy.
- Forgetting `const` on read-only member functions, making them unusable through `const&`.
