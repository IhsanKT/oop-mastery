## Why look under the hood?

In C++ a class is a compile-time blueprint: members are fixed, layout is fixed, and the type does not exist as a value at run time. Python is the opposite. A class is a live object you can inspect, pass around and build in a loop, and attribute access is a *protocol* you can hook. Frameworks such as Django, SQLAlchemy and `dataclasses` all work by using those hooks. This module opens the hood; each section notes what C++ does instead.

## Everything is an object

Integers, functions, modules and classes are all objects. A class is an instance of its *metaclass*, and the default metaclass is `type`; `type` itself is an instance of `type`.

~~~cpp
#include <typeinfo>
struct Dog {};
// A class is not a value; typeid gives only a read-only description.
const std::type_info& t = typeid(Dog);
// There is no run-time "class of classes" to hold or change.
~~~
~~~python
class Dog:
    pass

type(Dog)         # <class 'type'>: a class is an object whose class is type
type(type)        # <class 'type'>
Dog.__name__      # 'Dog'
Cat = type("Cat", (), {"sound": lambda self: "meow"})   # build a class at run time
~~~

## Attribute lookup order

For `obj.name`, Python checks, in order: (1) a **data descriptor** on the class (it defines `__set__` or `__delete__`), (2) the instance `__dict__`, (3) a **non-data descriptor** or plain class attribute (this includes methods). Failing that, `__getattr__` runs if defined.

~~~cpp
struct A {
    int x = 1;        // member: found at a fixed offset, at compile time
    int get() const { return x; }
};
// Name lookup happens at compile time; a typo is a compile error, not a run-time miss.
~~~
~~~python
class A:
    @property                    # property is a data descriptor
    def x(self):
        return "from property"

a = A()
a.__dict__["x"] = "from instance"
print(a.x)    # from property: the data descriptor wins over the instance dict
~~~

## Descriptors

A descriptor is an object with `__get__`, and optionally `__set__` and `__set_name__`, stored on a class. `__set_name__(self, owner, name)` is called once when the class is created and tells the descriptor the attribute name it was assigned to.

~~~cpp
// C++ equivalent: a wrapper type that guards a member.
template <typename T, bool (*Valid)(const T&)>
class Checked {
    T v_{};
public:
    Checked& operator=(const T& x) {
        if (!Valid(x)) throw std::invalid_argument("bad value");
        v_ = x; return *this;
    }
    const T& get() const { return v_; }
};
~~~
~~~python
class Positive:
    def __set_name__(self, owner, name):
        self.private = "_" + name           # storage name, derived once
    def __get__(self, obj, objtype=None):
        return self if obj is None else getattr(obj, self.private)
    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError("must be positive")
        setattr(obj, self.private, value)

class Item:
    qty = Positive()
~~~

> **Under the hood:** Functions are non-data descriptors. `obj.method` calls `function.__get__(obj, type(obj))`, which returns a *bound method* with `obj` pre-filled as `self`. `property`, `classmethod` and `staticmethod` are descriptors too.

## `__getattr__`, `__getattribute__`, `__setattr__`

`__getattribute__` runs for **every** attribute access; `__getattr__` runs only as a fallback when normal lookup fails. Use `__getattr__` for delegation and proxies.

~~~cpp
// C++ has no hook for unknown members. A proxy must forward each one by hand:
class Proxy {
    std::vector<int>& target_;
public:
    explicit Proxy(std::vector<int>& t) : target_(t) {}
    std::size_t size() const { return target_.size(); }
};
~~~
~~~python
class Proxy:
    def __init__(self, target):
        object.__setattr__(self, "_target", target)
    def __getattr__(self, name):               # only for missing names
        return getattr(self._target, name)

p = Proxy([1, 2, 3])
p.count(2)    # forwarded to the list
~~~

> **Pitfall:** Inside `__getattribute__`, reading `self.anything` calls `__getattribute__` again and recurses forever. Use `object.__getattribute__(self, name)` or `super().__getattribute__(name)`.

## `__slots__`

By default each instance has a `__dict__`. `__slots__` replaces it with fixed storage: smaller instances, faster access, and no new attributes.

~~~cpp
struct Point { double x, y; };   // fixed layout: always 16 bytes, no extra members possible
~~~
~~~python
class Point:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x, self.y = x, y

p = Point(1, 2)
# p.z = 3  -> AttributeError
# p.__dict__ -> AttributeError
~~~

> **Note:** A subclass without its own `__slots__` gets a `__dict__` again. Each class in the chain must declare `__slots__` to stay dict-free.

## Dataclasses

`@dataclass` generates `__init__`, `__repr__` and `__eq__` from annotated fields. Options: `frozen=True` (immutable), `order=True` (comparisons by field tuple), `slots=True`.

~~~cpp
struct Version {
    int major, minor;
    auto operator<=>(const Version&) const = default;   // C++20 generates comparisons
};
~~~
~~~python
from dataclasses import dataclass, field

@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int = 0
    tags: tuple = ()

    def __post_init__(self):              # runs after the generated __init__
        if self.major < 0:
            raise ValueError("negative")

@dataclass
class Bag:
    items: list = field(default_factory=list)   # a fresh list per instance
~~~

> **Pitfall:** `items: list = []` is rejected by dataclasses for exactly the shared-mutable-default reason; use `default_factory`.

## `__init_subclass__` and class decorators

`__init_subclass__` runs on the parent every time a subclass is defined, which makes plugin registries trivial. Keyword arguments in the class statement are passed to it.

~~~cpp
// C++: self-registration through a static object's constructor.
struct Registry {
    static std::map<std::string, int>& table() { static std::map<std::string, int> t; return t; }
};
struct Reg { Reg(const char* k, int v) { Registry::table()[k] = v; } };
static Reg csvReg("csv", 1);    // runs before main()
~~~
~~~python
class Plugin:
    registry = {}
    def __init_subclass__(cls, key=None, **kw):
        super().__init_subclass__(**kw)
        if key:
            Plugin.registry[key] = cls

class Csv(Plugin, key="csv"):
    pass

Plugin.registry["csv"] is Csv   # True
~~~

## Metaclasses and enums

A metaclass customizes class *creation*. Reach for `__init_subclass__`, a class decorator or a descriptor first; a metaclass is only for rare cases such as changing how the class namespace is built. Enums are a ready-made use of one.

~~~cpp
enum class Color { Red = 1, Green = 2 };    // no name(): reflection is absent
~~~
~~~python
from enum import Enum

class Color(Enum):
    RED = 1
    GREEN = 2

Color.RED.name     # 'RED'
Color.RED.value    # 1
Color(2)           # <Color.GREEN: 2>
~~~

> **C++ vs Python:** C++ cannot add members at run time, enumerate members, or read names reflectively (until reflection is standardized). Python can do all of that, at the cost of run-time overhead and fewer compile-time guarantees.

## Key takeaways

- Classes are objects; `type` is the default metaclass and `type(type) is type`.
- Lookup order: data descriptor, instance `__dict__`, non-data descriptor or class attribute, then `__getattr__`.
- Descriptors implement `__get__`/`__set__`; `property` and bound methods are built from them.
- `__getattr__` is a fallback; `__getattribute__` intercepts everything and needs `object.__getattribute__` to avoid recursion.
- `__slots__` removes the per-instance dict and blocks new attributes.
- Dataclasses generate boilerplate; use `default_factory` for mutable defaults and `__post_init__` for validation.
- `__init_subclass__` covers most uses people reach metaclasses for.
- C++ fixes layout at compile time and relies on templates and static initializers for what Python does dynamically.

## Common pitfalls

- Reading `self.x` inside `__getattribute__` and recursing infinitely.
- Expecting `__getattr__` to run for attributes that already exist.
- Subclassing a `__slots__` class without declaring `__slots__` and silently regaining a `__dict__`.
- Mutable class-level defaults shared across instances.
- Forgetting that a descriptor must live on the class, not on the instance.
