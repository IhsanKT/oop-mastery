## Why combine roles, and the risks

Real objects play several roles: a `Document` is *printable* and *serializable*; a `Duck` can *fly* and *swim*. Single inheritance forces you to pick one parent. **Multiple inheritance** lets a class inherit from several, which is powerful and risky: two bases may define the same name, and two bases may share a common ancestor (the *diamond*).

## C++ syntax and ambiguity

~~~cpp
struct Flyer  { void move() { std::cout << "fly\n"; } };
struct Swimmer{ void move() { std::cout << "swim\n"; } };
struct Duck : Flyer, Swimmer {};

Duck d;
// d.move();            // error: request for member 'move' is ambiguous
d.Flyer::move();        // qualify to choose
struct Duck2 : Flyer, Swimmer {
    void move() { Flyer::move(); Swimmer::move(); }   // or resolve it in the class
};
~~~
~~~python
class Flyer:
    def move(self): return "fly"
class Swimmer:
    def move(self): return "swim"
class Duck(Flyer, Swimmer): pass

Duck().move()            # 'fly': no ambiguity error; the MRO picks the leftmost base
Swimmer.move(Duck())     # 'swim': name the class to choose another
~~~

C++ refuses ambiguous names at compile time. Python never errors: the first class in the **method resolution order** wins.

## The diamond and `virtual` inheritance

~~~cpp
struct A { int id; A(int i) : id(i) { std::cout << "A "; } };
struct B : A { B() : A(1) { std::cout << "B "; } };
struct C : A { C() : A(2) { std::cout << "C "; } };
struct D : B, C {};
D d;                    // prints A B A C : two separate A subobjects
// d.id                 // ambiguous: B::A::id or C::A::id?

struct B2 : virtual A { B2() : A(1) { std::cout << "B2 "; } };
struct C2 : virtual A { C2() : A(2) { std::cout << "C2 "; } };
struct D2 : B2, C2 { D2() : A(7) { std::cout << "D2 "; } };   // the MOST DERIVED class builds A
D2 e;                   // prints A B2 C2 D2 : one A, id == 7
~~~
~~~python
class A:
    def __init__(self): print("A")
class B(A):
    def __init__(self): print("B"); super().__init__()
class C(A):
    def __init__(self): print("C"); super().__init__()
class D(B, C): pass

D()                     # B, C, A: A runs once, because Python shares one A
~~~

Without `virtual`, `D` holds two `A` subobjects. With `virtual` inheritance there is one shared `A`, and the **most-derived class** (`D2`) initializes it; the `A(...)` calls in `B2` and `C2` constructors are ignored when building a `D2`. Virtual bases are built first. In Python there is only one `A` in the MRO, so the problem looks different.

## Interface-style multiple inheritance

~~~cpp
struct Printable   { virtual ~Printable() = default; virtual void print() const = 0; };
struct Serializable{ virtual ~Serializable() = default; virtual std::string save() const = 0; };

class Invoice : public Printable, public Serializable {
public:
    void print() const override { std::cout << "Invoice\n"; }
    std::string save() const override { return "invoice"; }
};
~~~
~~~python
from abc import ABC, abstractmethod
class Printable(ABC):
    @abstractmethod
    def print(self): ...
class Serializable(ABC):
    @abstractmethod
    def save(self): ...
class Invoice(Printable, Serializable):
    def print(self): print("Invoice")
    def save(self): return "invoice"
~~~

Inheriting several **pure interfaces** (no data, no implementation) is safe and common: nothing can conflict. Trouble starts when bases carry state or implementation.

## Python's MRO and C3 linearization

~~~cpp
// C++ has no MRO: each base is a separate subobject and names are
// resolved statically. The ordering of bases only affects construction order.
~~~
~~~python
class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass

[k.__name__ for k in D.__mro__]    # ['D', 'B', 'C', 'A', 'object']
# C3: L[D] = D + merge(L[B], L[C], [B, C])
#            = D + merge([B, A, object], [C, A, object], [B, C])
#            -> B (first head not in any tail), C, then A, object

class X(A, B): pass                # TypeError: Cannot create a consistent MRO
~~~

C3 keeps each class before its bases, keeps the order of bases as written, and is monotonic. Putting a base before its own subclass (`X(A, B)` where `B` derives from `A`) is impossible to linearize, so Python raises `TypeError` when the class is created.

## Cooperative `super()` and mixins

~~~cpp
// C++: each constructor names its bases; virtual inheritance is the tool for sharing.
// There is no "next in line" call.
~~~
~~~python
class Base:
    def __init__(self, **kwargs):
        super().__init__(**kwargs)           # reaches object last
class Timestamped(Base):
    def __init__(self, created=0, **kwargs):
        super().__init__(**kwargs)
        self.created = created
class Tagged(Base):
    def __init__(self, tag="", **kwargs):
        super().__init__(**kwargs)
        self.tag = tag
class Article(Timestamped, Tagged): pass

a = Article(created=5, tag="py")             # every __init__ runs exactly once
~~~

`super()` means **"the next class in the instance's MRO"**, not "my parent". For `Article`, `Timestamped`'s `super()` is `Tagged`. Every class in the chain must call `super().__init__(**kwargs)` and pass on what it does not consume. If instead `Timestamped` called `Base.__init__(self)` directly, `Tagged` would be skipped, and calling base initializers directly from both `B` and `C` would run `A.__init__` twice.

A **mixin** is a small class that adds one capability and is not meant to stand alone:

~~~cpp
template <class Derived>
struct Printing {                            // CRTP mixin, resolved at compile time
    void print() const { std::cout << static_cast<const Derived&>(*this).str() << "\n"; }
};
struct P : Printing<P> { std::string str() const { return "P"; } };
~~~
~~~python
import json
class JsonMixin:
    def to_json(self):
        return json.dumps(self.__dict__, sort_keys=True)   # relies on the host's attributes

class Point(JsonMixin):
    def __init__(self, x, y): self.x, self.y = x, y
Point(1, 2).to_json()    # '{"x": 1, "y": 2}'
~~~

Guidelines: keep mixins small and stateless, give them no `__init__` of their own (or use `**kwargs` cooperatively), list them **before** the main base, and document what the host must provide.

> **Note:** Prefer interfaces plus composition. If a class `has` a printer, hold one in a member instead of inheriting from `Printer`.

## Key takeaways

- Multiple inheritance combines roles, but conflicting names and shared ancestors (the diamond) are the risk.
- C++ rejects ambiguous names; qualify (`Flyer::move()`) or override in the derived class.
- Without `virtual`, a diamond contains two copies of the shared base; `virtual` inheritance makes it one.
- The most-derived class constructs a virtual base, and the intermediate classes' calls to it are ignored.
- Inheriting several pure interfaces is safe and idiomatic in both languages.
- Python orders classes by C3 linearization; `D.__mro__` shows it, and an impossible order raises `TypeError` at class creation.
- `super()` means the next class in the MRO, so cooperative classes call `super().__init__(**kwargs)` everywhere.
- Mixins add one small capability; keep them stateless and put them to the left of the main base.

## Common pitfalls

- Calling `Base.__init__(self)` directly in a diamond: bases run twice or get skipped.
- Forgetting `**kwargs` forwarding, which breaks a cooperative chain.
- Expecting an error for a name clash in Python: the leftmost base silently wins.
- Using `virtual` inheritance and then forgetting that the most-derived class must construct the virtual base.
- Listing bases in an order that contradicts the hierarchy (`class X(A, B)` with `B` a subclass of `A`).
- Mixing data-carrying bases when an interface plus a member would do.
