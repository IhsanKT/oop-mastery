## Why generics?

Suppose you write an `IntStack`. Next week you need a `StringStack`, then a `WidgetStack`. Copy-pasting breaks the rule "one fact, one place": a bug fixed in one copy lives on in the others. **Generic programming** writes the algorithm once and lets the element type be a parameter. C++ does this at compile time with templates (a new, fully typed class per element type). Python is dynamically typed, so a single class already holds anything, and type hints exist for tools and readers.

## Function and class templates

A template is a recipe; the compiler *instantiates* a real function or class for each distinct set of template arguments.

~~~cpp
#include <stdexcept>
#include <vector>

template <typename T>
class Stack {
    std::vector<T> items_;
public:
    void push(const T& v) { items_.push_back(v); }
    T pop() {
        if (items_.empty()) throw std::out_of_range("empty stack");
        T v = std::move(items_.back());
        items_.pop_back();
        return v;
    }
    bool empty() const { return items_.empty(); }
};

template <typename T>
T maxOf(T a, T b) { return a < b ? b : a; }

Stack<int> s;          // instantiates Stack for int
maxOf(3, 7);           // T deduced as int
maxOf<double>(3, 7.5); // T given explicitly
~~~
~~~python
class Stack:
    def __init__(self):
        self._items = []
    def push(self, v):
        self._items.append(v)
    def pop(self):
        if not self._items:
            raise IndexError("empty stack")
        return self._items.pop()

def max_of(a, b):
    return b if a < b else a    # works for anything with <
~~~

> **Note:** A template's definition must be visible wherever it is instantiated, so templates normally live entirely in headers. Defining them in a `.cpp` file usually produces a link error for any type that file does not instantiate itself.

## Specialization

A *full* specialization replaces the template for one exact argument list. A *partial* specialization (class templates only) covers a family of arguments.

~~~cpp
template <typename T> struct Printer {
    static std::string show(const T& v) { return std::to_string(v); }
};
template <> struct Printer<bool> {                  // full specialization
    static std::string show(bool v) { return v ? "yes" : "no"; }
};
template <typename T> struct Printer<T*> {          // partial specialization
    static std::string show(T* p) { return p ? "ptr" : "null"; }
};
~~~
~~~python
from functools import singledispatch

@singledispatch
def show(v):
    return str(v)

@show.register
def _(v: bool):
    return "yes" if v else "no"
~~~

## Static polymorphism and CRTP

Virtual functions pick behavior at run time (a vtable lookup, open to new types at run time). Templates pick it at compile time: no indirection, inlinable, but each type needs its own compiled code and the type must be known statically. The **Curiously Recurring Template Pattern** (CRTP) combines inheritance with that idea: a base class templated on its derived class.

~~~cpp
template <typename Derived>
struct Comparable {
    friend bool operator>(const Derived& a, const Derived& b) { return b < a; }
    friend bool operator<=(const Derived& a, const Derived& b) { return !(b < a); }
};

struct Version : Comparable<Version> {
    int n;
    explicit Version(int n) : n(n) {}
    friend bool operator<(const Version& a, const Version& b) { return a.n < b.n; }
};
// Version(2) > Version(1) works with no virtual calls
~~~
~~~python
from functools import total_ordering

@total_ordering          # adds >, <=, >= from __eq__ and __lt__
class Version:
    def __init__(self, n):
        self.n = n
    def __eq__(self, o):
        return self.n == o.n
    def __lt__(self, o):
        return self.n < o.n
~~~

> **Under the hood:** In CRTP the base can call derived members with `static_cast<Derived&>(*this)`, with no virtual call. The trade-off: no common runtime base, so you cannot keep different `Derived` types in one container.

## Concepts, `if constexpr` and type traits

C++20 **concepts** name the requirements on a template argument. A violated requirement yields a short, readable error at the call, instead of a wall of text from deep inside the template.

~~~cpp
#include <concepts>
#include <type_traits>

template <typename T>
concept Addable = requires(T a, T b) { { a + b } -> std::convertible_to<T>; };

template <Addable T>
T sum(T a, T b) { return a + b; }

template <typename T>
std::string kind() {
    if constexpr (std::is_integral_v<T>) return "integer";   // only this branch is compiled
    else if constexpr (std::is_same_v<T, double>) return "double";
    else return "other";
}
~~~
~~~python
from typing import Protocol

class Addable(Protocol):
    def __add__(self, other): ...

def total(a: Addable, b: Addable):
    return a + b          # a checker verifies the Protocol; the runtime does not
~~~

## Python generics

Duck typing is already generic: any object with the right methods works. Type parameters only document intent and help checkers. Python 3.12 added PEP 695 syntax; older code uses `TypeVar` and `Generic`.

~~~cpp
template <typename T>
requires std::totally_ordered<T>        // a bound: T must support <, >, ==
T largest(const std::vector<T>& v);
~~~
~~~python
from typing import Generic, TypeVar, Protocol

T = TypeVar("T")
class Stack(Generic[T]):                 # classic form
    def __init__(self) -> None:
        self._items: list[T] = []
    def push(self, v: T) -> None:
        self._items.append(v)

class Box[T]:                            # PEP 695 (3.12+): T is scoped to the class
    def __init__(self, value: T) -> None:
        self.value = value

class SupportsLt(Protocol):
    def __lt__(self, other, /) -> bool: ...

def largest[T: SupportsLt](items: list[T]) -> T:   # bounded type parameter
    return max(items)
~~~

> **Pitfall:** Hints are not enforced. `Stack[int]()` happily accepts `"text"` at run time; only a tool such as mypy or pyright reports it.

## Variance

If `Dog` is an `Animal`, is `Box[Dog]` a `Box[Animal]`? For a read-only container, yes (*covariant*). For a mutable one, no, because you could insert a `Cat` through the `Animal` view. A consumer that only accepts values is *contravariant*. C++ templates are invariant (`vector<Dog>` is unrelated to `vector<Animal>`), and Python checkers infer or let you declare variance on the type parameter.

## Key takeaways

- A template is a recipe; the compiler instantiates one real type or function per distinct argument list.
- Keep template definitions in headers so every instantiation can see them.
- Full specialization replaces one case; partial specialization covers a family and works for class templates only.
- Virtual dispatch is run-time and flexible; templates and CRTP are compile-time and fast but need static types.
- Concepts (`requires`) state constraints and give clear errors; `if constexpr` compiles only the matching branch.
- Python is generic by duck typing; `TypeVar`, `Generic[T]`, `class Box[T]` and `Protocol` serve checkers, not the interpreter.
- Mutable containers are invariant; read-only ones may be covariant.

## Common pitfalls

- Defining a template in a `.cpp` file and getting undefined-reference errors.
- Expecting `Stack[int]` in Python to reject a `str` at run time.
- Forgetting that `maxOf(3, 7.5)` fails to deduce one `T` (int vs double).
- Using CRTP with a base that needs a complete `Derived` in its declaration.
- Specializing a function template and expecting partial-specialization rules; overload instead.
